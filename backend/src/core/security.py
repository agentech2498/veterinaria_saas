import logging
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Cookie, Depends, HTTPException, status, Request
from src.core.database import AsyncSessionLocal
from src.models.models import User, Organization
from sqlalchemy import select

logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError(
        "La variable de entorno SECRET_KEY no está configurada. "
        "Defínala antes de iniciar el servidor."
    )
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 24 hours

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(request: Request, admin_token: str = Cookie(None)):
    token = admin_token
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            logger.warning("Token decodificado sin campo 'sub'")
            return None
        return username
    except JWTError:
        logger.warning("Token JWT inválido o expirado")
        return None

async def admin_required(username: str = Depends(get_current_user)):
    if not username:
        logger.warning("Acceso denegado: sin autenticación válida")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or unauthorized",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return username

async def ui_access_required(username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(
            select(User, Organization)
            .join(Organization, User.org_id == Organization.id)
            .where(User.username == username)
        )
        row = res.first()
        if not row:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        user, org = row
        # Unified Pro plan: all authenticated organizations have full UI access
        return "full_access"
def check_plan_feature(current_plan: str, required_feature: str) -> bool:
    """Unified Pro plan: all features are available to all organizations."""
    return True
