#!/usr/bin/env python
"""Test database connection"""

import asyncio

from app.core.database import engine
from sqlalchemy import text


async def test_connection():
    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"✅ Connected successfully!")
            print(f"PostgreSQL Version: {version}")

            # Check if lady_andal database is accessible
            result = await conn.execute(text("SELECT current_database();"))
            db_name = result.scalar()
            print(f"Current Database: {db_name}")

        return True
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False


if __name__ == "__main__":
    asyncio.run(test_connection())
