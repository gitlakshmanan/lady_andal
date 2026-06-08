import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = (
        "postgresql://lady_andal:Snowfall%23123@localhost:5433/lady_andal_erp"
    )
    DATABASE_STARTUP_REQUIRED: bool = False

    # Security
    SECRET_KEY: str = "55_pHenAYqUlfIIyIqt-yqtAFbb6Ur-mIKVjFLrZRzZfQ28dbfuLADOzwZUT5OAb"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
        "http://127.0.0.1:5500",
    ]
    ALLOWED_HOSTS: List[str] = ["*"]

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    """
    # AWS
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = "lady-andal-erp"
    AWS_REGION: str = "ap-south-1"

    # Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@ladyandal.edu"
    """
    # Application
    APP_NAME: str = "Lady Andal ERP"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
