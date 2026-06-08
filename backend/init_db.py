#!/usr/bin/env python
"""
Run this script to initialize the database and create tables
Usage: python init_db.py
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

import logging

from app.core.database import Base, engine
from app.core.security import get_password_hash
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_database():
    """Initialize database tables and create default admin user"""
    try:
        # Test connection
        async with engine.begin() as conn:
            # Test if we can connect
            await conn.execute(text("SELECT 1"))
            logger.info("Database connection successful!")

            # Create all tables
            logger.info("Creating tables...")
            await conn.run_sync(Base.metadata.create_all)
            logger.info("Tables created successfully!")

        # Create default admin user
        from app.core.database import AsyncSessionLocal
        from app.models.department import Department
        from app.models.location import Location
        from app.models.user import User

        async with AsyncSessionLocal() as db:
            # Check if admin exists
            from sqlalchemy import select

            result = await db.execute(select(User).where(User.username == "admin"))
            admin = result.scalar_one_or_none()

            if not admin:
                # Create default location if not exists
                result = await db.execute(select(Location).limit(1))
                location = result.scalar_one_or_none()
                if not location:
                    location = Location(
                        code="TN-CHN-001",
                        name="Chennai Main Branch",
                        type="branch",
                        city="Chennai",
                        state="Tamil Nadu",
                        is_active=True,
                    )
                    db.add(location)
                    await db.flush()
                    logger.info("Default location created")

                # Create default department
                result = await db.execute(select(Department).limit(1))
                department = result.scalar_one_or_none()
                if not department:
                    department = Department(
                        code="ADMIN",
                        name="Administration",
                        description="Administration Department",
                        is_active=True,
                    )
                    db.add(department)
                    await db.flush()
                    logger.info("Default department created")

                # Create admin user
                admin = User(
                    username="admin",
                    email="admin@ladyandal.edu",
                    hashed_password=get_password_hash("admin123"),
                    full_name="System Administrator",
                    is_superuser=True,
                    is_active=True,
                    location_id=location.id,
                    department_id=department.id,
                )
                db.add(admin)
                await db.commit()
                logger.info("Admin user created successfully!")
                logger.info("   Username: admin")
                logger.info("   Password: admin123")
            else:
                logger.info("Admin user already exists")

        logger.info("\nDatabase initialization completed successfully!")
        logger.info("\nYou can now run the backend:")
        logger.info("  uvicorn app.main:app --reload")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(init_database())
