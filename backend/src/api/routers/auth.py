import logging
import re
from fastapi import APIRouter, Request, HTTPException

from src.schemas.auth import LoginRequest, SignupRequest
from src.core.database import AsyncSessionLocal
from src.core.security import verify_password, create_access_token, get_password_hash
from src.models.models import User, Organization
from sqlalchemy import select

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/login")
async def login_handle(payload: LoginRequest):
    username = payload.username
    password = payload.password
    
    async with AsyncSessionLocal() as session:
        # Use outerjoin so Superadmins (org_id=None) can still login
        res = await session.execute(
            select(User, Organization)
            .outerjoin(Organization, User.org_id == Organization.id)
            .where(User.username == username)
        )
        row = res.first()
        
        if row:
            user, org = row
            if verify_password(password, user.password_hash):
                # Only check is_active if it's NOT a superadmin
                if not user.is_superadmin:
                    if not org:
                        logger.warning("Login fallido: usuario '%s' sin organización asignada", username)
                        raise HTTPException(status_code=403, detail="Usuario sin organización asignada.")
                    if not org.is_active:
                        logger.warning("Login fallido: organización '%s' desactivada", org.slug)
                        raise HTTPException(status_code=403, detail="Esta organización está desactivada.")

                # Create JWT Token
                access_token = create_access_token(data={"sub": username})
                role = "superadmin" if user.is_superadmin else "admin"
                logger.info("Login exitoso: usuario '%s' rol '%s'", username, role)

                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "role": role,
                    "org_id": org.id if org else None
                }

    logger.warning("Login fallido: credenciales inválidas para usuario '%s'", username)
    raise HTTPException(status_code=401, detail="Credenciales inválidas")

@router.post("/logout")
async def logout():
    return {"status": "success", "message": "Logged out successfully"}

@router.post("/signup")
async def signup_handle(payload: SignupRequest):
    org_name = payload.org_name
    username = payload.username
    password = payload.password
    
    if not org_name or not username or not password:
        raise HTTPException(status_code=400, detail="Faltan datos requeridos")

    # Generate slug for org
    slug = re.sub(r'[^a-z0-9]', '-', org_name.lower().strip())

    async with AsyncSessionLocal() as session:
        check_org = await session.execute(select(Organization).where(Organization.name == org_name))
        if check_org.scalar():
            logger.warning("Signup fallido: organización '%s' ya existe", org_name)
            raise HTTPException(status_code=400, detail="La veterinaria ya existe.")

        check_user = await session.execute(select(User).where(User.username == username))
        if check_user.scalar():
            logger.warning("Signup fallido: usuario '%s' ya existe", username)
            raise HTTPException(status_code=400, detail="El usuario ya existe.")

        new_org = Organization(name=org_name, slug=slug)
        session.add(new_org)
        await session.flush()

        new_user = User(username=username, password_hash=get_password_hash(password), org_id=new_org.id, is_admin=True)
        session.add(new_user)
        await session.commit()
        logger.info("Signup exitoso: organización '%s' usuario '%s' creados", org_name, username)

    return {"status": "success", "message": "Usuario registrado correctamente"}
