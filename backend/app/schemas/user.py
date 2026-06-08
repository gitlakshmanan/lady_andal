from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str
    location_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    location_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: Optional[datetime] = None
    location_id: Optional[int] = None
    department_id: Optional[int] = None
    is_superuser: bool = False

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str
