import asyncio
import sys
sys.path.append('.')
from src.core.database import AsyncSessionLocal
from src.models.models import User
from sqlalchemy import select
from src.core.security import verify_password

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.username == 'admin_ibera'))
        user = res.scalar()
        if user:
            print(f"Hash: {user.password_hash}")
            try:
                print("Verify Ibera_123:", verify_password("Ibera_123", user.password_hash))
            except Exception as e:
                print(f"Error: {e}")
        else:
            print("User not found")

asyncio.run(main())
