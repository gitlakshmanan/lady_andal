
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from datetime import datetime
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token, get_password_hash
from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, TokenRefresh
from app.services.audit_service import log_audit
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    # Check if user exists
    result = await db.execute(
        select(User).where(
            (User.email == user_data.email) | (User.username == user_data.username)
        )
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already registered"
        )

    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        location_id=user_data.location_id,
        department_id=user_data.department_id
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await log_audit(
        db=db,
        user_id=new_user.id,
        username=new_user.username,
        action="REGISTER",
        old_value=None,
        new_value={"user_id": new_user.id, "email": new_user.email},
        ip_address=request.client.host,
        severity="INFO"
    )

    return UserResponse(
        id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name,
        is_active=new_user.is_active,
        created_at=new_user.created_at
    )

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    # Find user by username or email
    result = await db.execute(
        select(User).where(
            (User.username == form_data.username) | (User.email == form_data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    # Update last login
    user.last_login = datetime.utcnow()
    user.last_ip = request.client.host
    await db.commit()

    # Create tokens
    token_data = {"sub": str(user.id), "username": user.username, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    await log_audit(
        db=db,
        user_id=user.id,
        username=user.username,
        action="LOGIN",
        old_value=None,
        new_value={"login_time": datetime.utcnow().isoformat()},
        ip_address=request.client.host,
        severity="INFO"
    )

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: TokenRefresh,
    db: AsyncSession = Depends(get_db)
):
    payload = decode_token(refresh_data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    token_data = {"sub": str(user.id), "username": user.username, "email": user.email}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="LOGOUT",
        old_value=None,
        new_value={"logout_time": datetime.utcnow().isoformat()},
        ip_address=request.client.host,
        severity="INFO"
    )

    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
        location_id=current_user.location_id,
        department_id=current_user.department_id,
        is_superuser=current_user.is_superuser
    )
