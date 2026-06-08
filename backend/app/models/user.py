from app.core.database import Base
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

# Association tables
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("role_id", Integer, ForeignKey("roles.id")),
)

user_permissions = Table(
    "user_permissions",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id")),
    Column("permission_id", Integer, ForeignKey("permissions.id")),
)

role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id")),
    Column("permission_id", Integer, ForeignKey("permissions.id")),
)


class User(Base):
    __tablename__ = "users"

    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Foreign keys
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    # Timestamps
    last_login = Column(DateTime(timezone=True), nullable=True)
    last_ip = Column(String(45), nullable=True)

    # Relationships
    location = relationship("Location", back_populates="users")
    department = relationship("Department", back_populates="users")
    roles = relationship("Role", secondary=user_roles, back_populates="users")
    permissions = relationship(
        "Permission", secondary=user_permissions, back_populates="users"
    )

    # Created relationships
    created_demands = relationship(
        "Demand", foreign_keys="Demand.created_by_id", back_populates="created_by"
    )
    created_transfers = relationship(
        "Transfer", foreign_keys="Transfer.created_by_id", back_populates="created_by"
    )
    approvals = relationship(
        "Approval", foreign_keys="Approval.approver_id", back_populates="approver"
    )


class Role(Base):
    __tablename__ = "roles"

    name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    scope_type = Column(
        String(20), default="branch"
    )  # 'all_india', 'district', 'branch', 'department'

    # Relationships
    users = relationship("User", secondary=user_roles, back_populates="roles")
    permissions = relationship(
        "Permission", secondary=role_permissions, back_populates="roles"
    )


class Permission(Base):
    __tablename__ = "permissions"

    code = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    module = Column(String(50), nullable=False)
    description = Column(Text)

    # Relationships
    roles = relationship(
        "Role", secondary=role_permissions, back_populates="permissions"
    )
    users = relationship(
        "User", secondary=user_permissions, back_populates="permissions"
    )
