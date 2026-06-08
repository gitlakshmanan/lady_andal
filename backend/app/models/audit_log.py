from app.core.database import Base
from sqlalchemy import JSON, Column, DateTime, Integer, String, Text
from sqlalchemy.sql import func


class AuditLog(Base):
    __tablename__ = "audit_logs"

    user_id = Column(Integer, nullable=False)
    username = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)
    old_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(255), nullable=True)
    severity = Column(String(20), default="INFO")  # INFO, WARNING, CRITICAL
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
