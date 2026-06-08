from typing import List

from app.api.dependencies import check_permission, get_current_user
from app.core.database import get_db
from app.core.permissions import PermissionCode
from app.models.department import Department
from app.models.user import User
from app.services.audit_service import log_audit
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/")
async def get_departments(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Department).where(Department.is_active == True))
    departments = result.scalars().all()
    return departments


@router.post("/")
async def create_department(
    department_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_department = Department(**department_data)
    db.add(new_department)
    await db.commit()
    await db.refresh(new_department)

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="CREATE_DEPARTMENT",
        old_value=None,
        new_value={"department_id": new_department.id, "name": new_department.name},
        ip_address=request.client.host,
    )

    return new_department


@router.put("/{department_id}")
async def update_department(
    department_id: int,
    department_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Department).where(Department.id == department_id))
    department = result.scalar_one_or_none()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    for key, value in department_data.items():
        setattr(department, key, value)

    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_DEPARTMENT",
        old_value=None,
        new_value=department_data,
        ip_address=request.client.host,
    )

    return department


@router.delete("/{department_id}")
async def delete_department(
    department_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Department).where(Department.id == department_id))
    department = result.scalar_one_or_none()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    department.is_active = False
    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="DELETE_DEPARTMENT",
        old_value={"department_id": department.id, "name": department.name},
        new_value=None,
        ip_address=request.client.host,
        severity="WARNING",
    )

    return {"message": "Department deleted successfully"}
