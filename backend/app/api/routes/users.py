from typing import List

from app.api.dependencies import check_permission, get_current_user
from app.core.database import get_db
from app.core.permissions import PermissionCode
from app.core.security import get_password_hash
from app.models.user import Role, User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.audit_service import log_audit
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if user exists
    result = await db.execute(
        select(User).where(
            (User.email == user_data.email) | (User.username == user_data.username)
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        location_id=user_data.location_id,
        department_id=user_data.department_id,
        is_active=user_data.is_active,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="CREATE_USER",
        old_value=None,
        new_value={"user_id": new_user.id, "username": new_user.username},
        ip_address=request.client.host,
    )

    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_data.dict(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))

    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_USER",
        old_value=None,
        new_value={"user_id": user.id, "changes": list(update_data.keys())},
        ip_address=request.client.host,
    )

    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    await db.delete(user)
    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="DELETE_USER",
        old_value={"user_id": user.id, "username": user.username},
        new_value=None,
        ip_address=request.client.host,
        severity="WARNING",
    )

    return {"message": "User deleted successfully"}


@router.put("/profile/me")
async def update_my_profile(
    profile_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    for key, value in profile_data.items():
        if hasattr(current_user, key) and key not in [
            "id",
            "username",
            "hashed_password",
        ]:
            setattr(current_user, key, value)

    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_PROFILE",
        old_value=None,
        new_value=profile_data,
        ip_address=request.client.host,
    )

    return {"message": "Profile updated successfully"}


@router.post("/change-password")
async def change_password(
    password_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.core.security import get_password_hash, verify_password

    if not verify_password(
        password_data["current_password"], current_user.hashed_password
    ):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.hashed_password = get_password_hash(password_data["new_password"])
    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="CHANGE_PASSWORD",
        old_value=None,
        new_value=None,
        ip_address=request.client.host,
        severity="WARNING",
    )

    return {"message": "Password changed successfully"}
