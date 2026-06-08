from app.core.database import Base
from sqlalchemy import Boolean, Column, String, Text
from sqlalchemy.orm import relationship


class Department(Base):
    __tablename__ = "departments"

    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    head_name = Column(String(100))
    head_email = Column(String(100))
    is_active = Column(Boolean, default=True)

    # Relationships
    users = relationship("User", back_populates="department")
    demands = relationship("Demand", back_populates="department")
