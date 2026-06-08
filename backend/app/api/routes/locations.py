from typing import List

from app.api.dependencies import check_permission, get_current_user
from app.core.database import get_db
from app.core.permissions import PermissionCode
from app.models.location import Location
from app.models.user import User
from app.services.audit_service import log_audit
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/")
async def get_locations(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Location).where(Location.is_active == True))
    locations = result.scalars().all()
    return locations


@router.post("/")
@check_permission(PermissionCode.MANAGE_SYSTEM)
async def create_location(
    location_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_location = Location(**location_data)
    db.add(new_location)
    await db.commit()
    await db.refresh(new_location)

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="CREATE_LOCATION",
        old_value=None,
        new_value={"location_id": new_location.id, "name": new_location.name},
        ip_address=request.client.host,
    )

    return new_location


@router.put("/{location_id}")
@check_permission(PermissionCode.MANAGE_SYSTEM)
async def update_location(
    location_id: int,
    location_data: dict,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    for key, value in location_data.items():
        setattr(location, key, value)

    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="UPDATE_LOCATION",
        old_value=None,
        new_value=location_data,
        ip_address=request.client.host,
    )

    return location


@router.delete("/{location_id}")
@check_permission(PermissionCode.MANAGE_SYSTEM)
async def delete_location(
    location_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    location.is_active = False
    await db.commit()

    await log_audit(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="DELETE_LOCATION",
        old_value={"location_id": location.id, "name": location.name},
        new_value=None,
        ip_address=request.client.host,
        severity="WARNING",
    )

    return {"message": "Location deleted successfully"}
