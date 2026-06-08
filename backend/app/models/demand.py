import enum

from app.core.database import Base
from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class DemandStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    REVIEWED = "REVIEWED"
    APPROVED = "APPROVED"
    ALLOCATED = "ALLOCATED"
    DISPATCHED = "DISPATCHED"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"
    REVERSED = "REVERSED"


class Demand(Base):
    __tablename__ = "demands"

    demand_number = Column(String(50), unique=True, nullable=False)
    status = Column(Enum(DemandStatus), default=DemandStatus.DRAFT)
    priority = Column(String(20), default="NORMAL")  # URGENT, HIGH, NORMAL, LOW
    required_by_date = Column(DateTime(timezone=True), nullable=True)
    remarks = Column(Text)
    total_quantity = Column(Numeric(12, 3), default=0)

    # Foreign keys
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    # Timestamps
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    created_by = relationship(
        "User", foreign_keys=[created_by_id], back_populates="created_demands"
    )
    location = relationship("Location")
    department = relationship("Department", back_populates="demands")
    items = relationship(
        "DemandItem", back_populates="demand", cascade="all, delete-orphan"
    )
    approvals = relationship("Approval", back_populates="demand")


class DemandItem(Base):
    __tablename__ = "demand_items"

    demand_id = Column(Integer, ForeignKey("demands.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    allocated_quantity = Column(Numeric(12, 3), default=0)
    unit_price = Column(Numeric(12, 2), nullable=True)
    remarks = Column(Text)

    # Relationships
    demand = relationship("Demand", back_populates="items")
    product = relationship("Product", back_populates="demand_items")


class Approval(Base):
    __tablename__ = "approvals"

    demand_id = Column(Integer, ForeignKey("demands.id"), nullable=False)
    approver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(20), nullable=False)  # APPROVE, REJECT, REVERSE
    remarks = Column(Text)
    approval_level = Column(Integer, default=1)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    demand = relationship("Demand", back_populates="approvals")
    approver = relationship(
        "User", foreign_keys=[approver_id], back_populates="approvals"
    )
