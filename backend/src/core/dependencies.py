"""
Shared FastAPI dependencies used across multiple routers.
Centralises cross-cutting concerns so they don't get duplicated.
"""
import logging
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.models import User, Organization

logger = logging.getLogger(__name__)


async def get_org(username: str, session: AsyncSession):
    """Resolve (User, Organization) for the given authenticated username.

    Raises HTTP 404 if the user or org cannot be found.
    """
    res = await session.execute(
        select(User, Organization)
        .join(Organization, User.org_id == Organization.id)
        .where(User.username == username)
    )
    row = res.first()
    if not row:
        logger.warning("get_org: usuario u organización no encontrado para '%s'", username)
        raise HTTPException(status_code=404, detail="Usuario u organización no encontrado")
    return row  # (user, org)
