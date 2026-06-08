import enum

from app.core.database import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func


class TransactionType(str, enum.Enum):
    STOCK_IN = "STOCK_IN"
    STOCK_OUT = "STOCK_OUT"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER = "TRANSFER"
    REVERSAL = "REVERSAL"


class Product(Base):
    __tablename__ = "products"

    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    unit = Column(String(20), nullable=False)
    min_stock = Column(Numeric(12, 3), default=0)
    max_stock = Column(Numeric(12, 3), default=0)
    reorder_level = Column(Numeric(12, 3), default=0)
    is_active = Column(Boolean, default=True)

    # Foreign keys
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Relationships
    category = relationship("Category", back_populates="products")
    ledger_entries = relationship("StockLedger", back_populates="product")
    demand_items = relationship("DemandItem", back_populates="product")
    transfer_items = relationship("TransferItem", back_populates="product")


class StockLedger(Base):
    __tablename__ = "stock_ledger"

    transaction_date = Column(DateTime(timezone=True), server_default=func.now())
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity_in = Column(Numeric(12, 3), default=0)
    quantity_out = Column(Numeric(12, 3), default=0)
    balance = Column(Numeric(12, 3), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    reference_id = Column(Integer)  # ID of the source transaction
    reference_type = Column(
        String(50)
    )  # Table name: 'stock_entries', 'demands', 'transfers'
    remarks = Column(Text)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)

    # Relationships
    product = relationship("Product", back_populates="ledger_entries")
    location = relationship("Location", back_populates="stock_entries")
