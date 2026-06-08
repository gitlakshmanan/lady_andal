import re

from app.core.config import settings
from sqlalchemy import Column, DateTime, Integer, func
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, declared_attr

# Convert postgresql:// to postgresql+asyncpg://
async_database_url = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

engine = create_async_engine(
    async_database_url, echo=settings.DEBUG, pool_size=20, max_overflow=10
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class BaseModel:
    @declared_attr
    def __tablename__(cls):
        # Convert CamelCase to snake_case
        name = re.sub(r"(?<!^)(?=[A-Z])", "_", cls.__name__).lower()
        return f"{name}s"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


Base = declarative_base(cls=BaseModel)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
