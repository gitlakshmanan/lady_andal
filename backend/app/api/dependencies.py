from typing import Optional

from app.core.database import get_db
from app.core.permissions import PermissionCode
from app.core.security import decode_token
from app.models.user import User
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def check_permission(required_permission: PermissionCode):
    async def permission_dependency(
        current_user: User = Depends(get_current_active_user),
    ) -> bool:
        if current_user.is_superuser:
            return True

        # Check user permissions
        user_permissions = [p.code for p in current_user.permissions]
        if required_permission in user_permissions:
            return True

        # Check role permissions
        for role in current_user.roles:
            role_permissions = [p.code for p in role.permissions]
            if required_permission in role_permissions:
                return True

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: {required_permission} required",
        )

    return permission_dependency
