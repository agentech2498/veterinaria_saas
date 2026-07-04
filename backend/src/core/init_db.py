import logging
from sqlalchemy import select, text
from src.core.security import get_password_hash
from src.core.database import engine, AsyncSessionLocal, Base
from src.models.models import Organization, User

logger = logging.getLogger(__name__)

async def init_db():
    logger.info("Alembic is handling schema creation/migration. Skipping create_all.")
    
    # We only keep the seeding logic.

    # Seed (Only if not already seeded)
    async with AsyncSessionLocal() as session:
        # 1. Check if we have any organizations, if not create default
        org_check = await session.execute(select(Organization).limit(1))
        if not org_check.scalar():
            logger.info("Seeding default organization...")
            default_org = Organization(name="Veterinaria Central", slug="central")
            session.add(default_org)
            await session.commit()
            await session.refresh(default_org)
        else:
            default_org = (await session.execute(select(Organization).where(Organization.slug == "central"))).scalar()

        # 2. Check if superadmin exists, if not create
        user_check = await session.execute(select(User).where(User.username == "superadmin"))
        if not user_check.scalar():
            import os
            super_pwd = os.getenv("SUPERADMIN_DEFAULT_PASSWORD", "SuperAdmin123!@#") 
            new_user = User(
                username="superadmin",
                password_hash=get_password_hash(super_pwd),
                org_id=default_org.id if default_org else None,
                is_admin=True,
                is_superadmin=True
            )
            session.add(new_user)
            await session.commit()
            logger.info("SuperAdmin created with username 'superadmin'.")
        else:
            logger.info("Superadmin already exists. Skipping seed.")
