import asyncio
import logging
from sqlalchemy import select
from src.core.database import AsyncSessionLocal
from src.core.security import get_password_hash
from src.models.models import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def setup_superadmin():
    email = "agentech.nea@gmail.com"
    password = "xEnEizE@41"
    
    async with AsyncSessionLocal() as session:
        # Buscamos al usuario "superadmin"
        res = await session.execute(select(User).where(User.username == "superadmin"))
        user = res.scalar()
        
        if user:
            logger.info("Actualizando superadmin existente...")
            user.email = email
            user.password_hash = get_password_hash(password)
            user.is_verified = True
        else:
            logger.info("Creando nuevo superadmin...")
            user = User(
                username="superadmin",
                email=email,
                password_hash=get_password_hash(password),
                is_admin=True,
                is_superadmin=True,
                is_verified=True
            )
            session.add(user)
            
        await session.commit()
        logger.info(f"Superadmin configurado exitosamente.")
        logger.info(f"Correo: {email}")
        logger.info("Contraseña actualizada correctamente.")

if __name__ == "__main__":
    asyncio.run(setup_superadmin())
