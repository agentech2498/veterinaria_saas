import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from src.core.logging import setup_logging

# Inicializar logging estructurado antes de importar routers
setup_logging(level=logging.DEBUG)

from src.api.routers import auth, admin, webhooks, superadmin, verify, attentions, finance, api_validacion, identity, documents

app = FastAPI(title="DogBot SaaS Universal API")

# Origins allowed to call the API. In production set ALLOWED_ORIGINS env var
# to a comma-separated list: "https://app.midominio.com,capacitor://localhost"
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

# Configure CORS for React/Capacitor
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.middleware.base import BaseHTTPMiddleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Mount local storage folder
STORAGE_PATH = os.environ.get("STORAGE_PATH", "./storage")
os.makedirs(STORAGE_PATH, exist_ok=True)
app.mount("/storage", StaticFiles(directory=STORAGE_PATH), name="storage")

@app.on_event("startup")
async def startup():
    from src.core.init_db import init_db as initialize
    await initialize()

# Root
@app.get("/")
async def root():
    return {"status": "DogBot SaaS Online 🐶", "login": "/login"}

@app.get("/health")
async def health_check():
    from src.core.database import engine
    from src.core.redis_client import redis_client
    from sqlalchemy import text
    from fastapi.responses import JSONResponse
    
    status_dict = {"status": "ok", "db": "ok", "redis": "ok"}
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        status_dict["db"] = f"error: {str(e)}"
        status_dict["status"] = "error"
        
    try:
        await redis_client.redis.ping()
    except Exception as e:
        status_dict["redis"] = f"error: {str(e)}"
        status_dict["status"] = "error"
        
    if status_dict["status"] == "error":
        return JSONResponse(content=status_dict, status_code=503)
        
    return status_dict

# Include Routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(superadmin.router) # SaaS Owner Panel
app.include_router(webhooks.router)
app.include_router(verify.router)
app.include_router(attentions.router)
app.include_router(finance.router)
app.include_router(api_validacion.router)
app.include_router(identity.router, prefix="/admin")
app.include_router(documents.router, prefix="/admin")
