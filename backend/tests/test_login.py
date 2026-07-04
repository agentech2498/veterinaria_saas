import asyncio
import sys
sys.path.append('.')
from src.core.database import AsyncSessionLocal
from src.models.models import User, Organization
from sqlalchemy import select
from src.core.security import verify_password

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User))
        users = res.scalars().all()
        for u in users:
            print(f"User: {u.username}, is_admin: {u.is_admin}, is_superadmin: {u.is_superadmin}, org_id: {u.org_id}")

asyncio.run(main())
