import asyncio
import sys
sys.path.append('.')
from src.core.database import AsyncSessionLocal
from src.models.models import User
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.username == 'superadmin'))
        user = res.scalar()
        if user:
            # Hash for SuperAdmin123!@#
            user.password_hash = "$pbkdf2-sha256$29000$GCNESOn9/////39vTWltbQ$7KSuZkUnEo5Ku5P/6h/T9RlqvwJ.6T1/X64m9DQ7fMA"
            await session.commit()
            print("Hash repaired successfully!")
        else:
            print("Superadmin not found!")

asyncio.run(main())
