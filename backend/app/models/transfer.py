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


class TransferStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    APPROVED = "APPROVED"
    IN_TRANSIT = "IN_TRANSIT"
    RECEIVED = "RECEIVED"
    REJECTED = "REJECTED"


class Transfer(Base):
    __tablename__ = "transfers"

    transfer_number = Column(String(50), unique=True, nullable=False)
    status = Column(Enum(TransferStatus), default=TransferStatus.DRAFT)
    transfer_date = Column(DateTime(timezone=True), server_default=func.now())
    expected_delivery_date = Column(DateTime(timezone=True), nullable=True)
    actual_delivery_date = Column(DateTime(timezone=True), nullable=True)
    remarks = Column(Text)
    total_quantity = Column(Numeric(12, 3), default=0)

    # Foreign keys
    from_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    to_location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    approved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Timestamps
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    from_location = relationship(
        "Location", foreign_keys=[from_location_id], back_populates="from_transfers"
    )
    to_location = relationship(
        "Location", foreign_keys=[to_location_id], back_populates="to_transfers"
    )
    created_by = relationship(
        "User", foreign_keys=[created_by_id], back_populates="created_transfers"
    )
    approved_by = relationship("User", foreign_keys=[approved_by_id])
    items = relationship(
        "TransferItem", back_populates="transfer", cascade="all, delete-orphan"
    )


class TransferItem(Base):
    __tablename__ = "transfer_items"

    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    received_quantity = Column(Numeric(12, 3), default=0)
    remarks = Column(Text)

    # Relationships
    transfer = relationship("Transfer", back_populates="items")
    product = relationship("Product", back_populates="transfer_items")
