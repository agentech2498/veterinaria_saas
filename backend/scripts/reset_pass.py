import asyncio
import sys
sys.path.append('.')
from src.core.database import AsyncSessionLocal
from src.models.models import User
from sqlalchemy import select
from src.core.security import get_password_hash

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.username == 'admin_ibera'))
        user = res.scalar()
        if user:
            user.password_hash = get_password_hash("Ibera123!")
            await session.commit()
            print("Contraseña reseteada exitosamente a Ibera123!")
        else:
            print("User not found")

asyncio.run(main())
