from typing import Any, Optional

from app.models.audit_log import AuditLog
from sqlalchemy.ext.asyncio import AsyncSession


async def log_audit(
    db: AsyncSession,
    user_id: int,
    username: str,
    action: str,
    old_value: Optional[Any] = None,
    new_value: Optional[Any] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    severity: str = "INFO",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
) -> AuditLog:
    entry = AuditLog(
        user_id=user_id,
        username=username,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        user_agent=user_agent,
        severity=severity,
    )
    db.add(entry)
    return entry
