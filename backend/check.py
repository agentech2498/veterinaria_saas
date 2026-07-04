import asyncio
from src.core.database import AsyncSessionLocal
from src.models.models import Organization
from sqlalchemy import select

async def main():
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(Organization))
        orgs = res.scalars().all()
        for o in orgs:
            print(f"Slug: {o.slug}, EvoURL: {o.evolution_api_url}, Instance: {o.evolution_instance}")

if __name__ == "__main__":
    asyncio.run(main())
