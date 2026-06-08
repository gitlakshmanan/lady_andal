from typing import List

from app.api.dependencies import check_permission, get_current_user
from app.core.database import get_db
from app.core.permissions import PermissionCode
from app.models.category import Category
from app.models.user import User
from app.services.audit_service import log_audit
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/")
async def get_categories(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Category).where(Category.is_active == True))
    categories = result.scalars().all()
    return categories


@router.post("/")
@check_permission(PermissionCode.MANAGE_PRODUCTS)
async def create_category(
    category_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_category = Category(**category_data)
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="CREATE_CATEGORY",
        old_value=None,
        new_value={"category_id": new_category.id, "name": new_category.name},
        ip_address=request.client.host,
    )

    return new_category


@router.put("/{category_id}")
@check_permission(PermissionCode.MANAGE_PRODUCTS)
async def update_category(
    category_id: int,
    category_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    for key, value in category_data.items():
        setattr(category, key, value)

    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_CATEGORY",
        old_value=None,
        new_value=category_data,
        ip_address=request.client.host,
    )

    return category


@router.delete("/{category_id}")
@check_permission(PermissionCode.MANAGE_PRODUCTS)
async def delete_category(
    category_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.is_active = False
    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="DELETE_CATEGORY",
        old_value={"category_id": category.id, "name": category.name},
        new_value=None,
        ip_address=request.client.host,
        severity="WARNING",
    )

    return {"message": "Category deleted successfully"}
