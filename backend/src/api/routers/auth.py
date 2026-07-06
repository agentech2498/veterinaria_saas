import logging
import re
from fastapi import APIRouter, Request, HTTPException, BackgroundTasks
from jose import jwt, JWTError
from datetime import datetime, timedelta

from src.schemas.auth import LoginRequest, SignupRequest
from src.core.database import AsyncSessionLocal
from src.core.security import verify_password, create_access_token, get_password_hash, SECRET_KEY, ALGORITHM
from src.models.models import User, Organization
from sqlalchemy import select, or_
from src.services.email_service import send_email_sync

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
            .where(or_(User.username == username, User.email == username, User.cuit == username))
        )
        row = res.first()
        
        if row:
            user, org = row
            if verify_password(password, user.password_hash):
                # Only check is_active and is_verified if it's NOT a superadmin
                if not user.is_superadmin:
                    if not user.is_verified:
                        logger.warning("Login fallido: usuario '%s' no está verificado", username)
                        raise HTTPException(status_code=403, detail="Debes verificar tu correo electrónico antes de iniciar sesión.")
                    
                    if not org:
                        logger.warning("Login fallido: usuario '%s' sin organización asignada", username)
                        raise HTTPException(status_code=403, detail="Usuario sin organización asignada.")
                    if not org.is_active:
                        logger.warning("Login fallido: organización '%s' desactivada", org.slug)
                        raise HTTPException(status_code=403, detail="Esta organización está desactivada.")

                # Create JWT Token
                access_token = create_access_token(data={"sub": user.username})
                role = "superadmin" if user.is_superadmin else "admin"
                logger.info("Login exitoso: usuario '%s' rol '%s'", user.username, role)

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
async def signup_handle(payload: SignupRequest, background_tasks: BackgroundTasks):
    org_name = payload.org_name
    username = payload.username
    password = payload.password
    email = payload.email
    cuit = payload.cuit
    
    if not org_name or not username or not password or not email:
        raise HTTPException(status_code=400, detail="Faltan datos requeridos. El correo es obligatorio.")

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

        new_user = User(
            username=username, 
            password_hash=get_password_hash(password), 
            org_id=new_org.id, 
            is_admin=True,
            email=email,
            cuit=cuit,
            is_verified=False
        )
        session.add(new_user)
        await session.commit()
        logger.info("Signup exitoso: organización '%s' usuario '%s' creados", org_name, username)

        # Generar token de verificación de email
        expire = datetime.utcnow() + timedelta(hours=48)
        to_encode = {"sub": username, "exp": expire, "type": "email_verification"}
        token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        
        # URL del frontend para verificar
        verify_url = f"https://veterinariasnea.agentech.ar/verify-email?token={token}"
        subject = "Bienvenido a Veterinaria SaaS - Verifica tu correo"
        body = f"Hola {username},\n\nGracias por registrarte. Para poder ingresar al panel, por favor verifica tu correo electronico haciendo clic en el siguiente enlace:\n\n{verify_url}\n\nEste enlace expirara en 48 horas.\n\nSaludos,\nEl equipo de Veterinaria SaaS"
        
        background_tasks.add_task(send_email_sync, email, subject, body, False)

    return {"status": "success", "message": "Usuario registrado. Revisa tu correo para verificar la cuenta."}


@router.get("/verify-email")
async def verify_email_handle(token: str):
    if not token:
        raise HTTPException(status_code=400, detail="Token no proporcionado")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None or token_type != "email_verification":
            raise HTTPException(status_code=400, detail="Token invalido")
            
        async with AsyncSessionLocal() as session:
            res = await session.execute(select(User).where(User.username == username))
            user = res.scalar()
            if not user:
                raise HTTPException(status_code=404, detail="Usuario no encontrado")
            
            if user.is_verified:
                return {"status": "success", "message": "El correo ya estaba verificado."}
                
            user.is_verified = True
            await session.commit()
            logger.info("Correo verificado exitosamente para usuario '%s'", username)
            
            return {"status": "success", "message": "Correo verificado exitosamente. Ya puedes iniciar sesion."}
            
    except JWTError:
        raise HTTPException(status_code=400, detail="Token invalido o expirado")
