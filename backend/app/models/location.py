from app.core.database import Base
from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.orm import relationship


class Location(Base):
    __tablename__ = "locations"

    code = Column(String(50), unique=True, nullable=False)  # Format: TN-CHN-NUN
    name = Column(String(100), nullable=False)
    type = Column(String(20), default="branch")  # 'branch', 'godown', 'office'
    address = Column(Text)
    city = Column(String(50))
    district = Column(String(50))
    state = Column(String(50))
    pincode = Column(String(10))
    is_active = Column(Boolean, default=True)

    # Relationships
    users = relationship("User", back_populates="location")
    stock_entries = relationship("StockLedger", back_populates="location")
    from_transfers = relationship(
        "Transfer",
        foreign_keys="Transfer.from_location_id",
        back_populates="from_location",
    )
    to_transfers = relationship(
        "Transfer", foreign_keys="Transfer.to_location_id", back_populates="to_location"
    )
