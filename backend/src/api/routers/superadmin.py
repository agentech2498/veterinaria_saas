import logging
from fastapi import APIRouter, Request, Depends, HTTPException
from src.core.database import AsyncSessionLocal
from src.core.security import admin_required, get_password_hash, verify_password
from src.models.models import User, Organization, Patient, Appointment, Service, Owner, ClinicalRecord, Vaccination, DigitalCertificate, MedicalAttention, Ticket
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
import re
import httpx
from src.core.redis_client import redis_client
from src.schemas.organization import CreateOrganizationRequest, UpdateOrganizationRequest
from src.schemas.auth import ChangePasswordRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/superadmin", dependencies=[Depends(admin_required)])

async def superadmin_only(username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.username == username))
        user = res.scalar()
        if not user or not user.is_superadmin:
            logger.warning("Acceso superadmin denegado para usuario '%s'", username)
            raise HTTPException(status_code=403, detail="Acceso denegado: Se requiere perfil SuperAdmin")
    return username

@router.post("/create_org")
async def create_org(payload: CreateOrganizationRequest, username: str = Depends(superadmin_only)):
    """Crea una nueva veterinaria y su usuario administrador inicial."""
    name = payload.name
    # Generar slug básico si no viene
    slug = payload.slug or re.sub(r'[^a-z0-9]', '-', name.lower().strip())
    
    admin_user = payload.admin_username
    admin_pass = payload.admin_password

    async with AsyncSessionLocal() as session:
        # 1. Verificar si ya existe
        check = await session.execute(select(Organization).where(Organization.slug == slug))
        if check.scalar():
            return {"status": "error", "message": f"El slug '{slug}' ya existe."}

        # 2. Crear Org
        new_org = Organization(
            name=name,
            slug=slug,
            evolution_api_url=data.get("evolution_api_url"),
            evolution_api_key=data.get("evolution_api_key"),
            evolution_instance=data.get("evolution_instance"),
            openai_api_key=data.get("openai_api_key")
        )
        session.add(new_org)
        await session.flush() # Para obtener el ID

        # 3. Crear Usuario Admin inicial para esa Org
        new_user = User(
            username=admin_user,
            password_hash=get_password_hash(admin_pass),
            org_id=new_org.id,
            is_superadmin=False
        )
        session.add(new_user)
        await session.commit()
        logger.info("Organización creada: slug='%s' org_id=%d admin='%s'", slug, new_org.id, admin_user)

    return {"status": "success", "org_id": new_org.id, "slug": slug}

@router.get("/")
async def superadmin_panel(username: str = Depends(superadmin_only)):
    async with AsyncSessionLocal() as session:
        # Fetch all organizations
        orgs_res = await session.execute(select(Organization).order_by(Organization.id))
        orgs = orgs_res.scalars().all()
        
        # Convert to dicts for JSON serialization in template
        orgs_data = []
        for org in orgs:
            org_dict = {
                "id": org.id,
                "name": org.name,
                "slug": org.slug,
                "is_active": org.is_active,
                "evolution_api_url": org.evolution_api_url,
                "evolution_api_key": org.evolution_api_key,
                "evolution_instance": org.evolution_instance,
                "openai_api_key": org.openai_api_key,
                "google_calendar_id": org.google_calendar_id
            }
            orgs_data.append(org_dict)
        
        # Fetch all users with their org names
        users_res = await session.execute(
            select(User)
            .options(selectinload(User.organization))
            .order_by(User.id)
        )
        users = users_res.scalars().all()
        
        users_data = []
        for user_obj in users:
            users_data.append({
                "id": user_obj.id,
                "username": user_obj.username,
                "is_superadmin": user_obj.is_superadmin,
                "org_name": user_obj.organization.name if user_obj.organization else "N/A (SuperAdmin)"
            })
            
        return {
            "organizations": orgs_data,
            "users": users_data,
            "username": username
        }

@router.post("/toggle_org/{org_id}")
async def toggle_org(org_id: int, username: str = Depends(superadmin_only)):
    """Activa o suspende una veterinaria (Corta su acceso al bot y panel)"""
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).where(Organization.id == org_id))
        org = org_res.scalar()
        if org:
            org.is_active = not org.is_active
            await session.commit()
            # Opcional: Limpiar caché de Redis para que el cambio sea instantáneo en el bot
            await redis_client.redis.delete(f"org:config:{org.slug}")
            logger.info("Org %d toggle is_active -> %s", org_id, org.is_active)

    return {"status": "success", "new_state": org.is_active}

@router.get("/stats")
async def global_stats(username: str = Depends(superadmin_only)):
    """Resumen de métricas para el dueño del SaaS"""
    async with AsyncSessionLocal() as session:
        total_clinics_res = await session.execute(select(func.count()).select_from(Organization))
        total_patients_res = await session.execute(select(func.count()).select_from(Patient))
        total_apps_res = await session.execute(select(func.count()).select_from(Appointment))

        return {
            "total_clinics": total_clinics_res.scalar() or 0,
            "total_patients_global": total_patients_res.scalar() or 0,
            "total_appointments_global": total_apps_res.scalar() or 0,
        }
@router.post("/change_plan/{org_id}")
async def change_plan(org_id: int, request: Request, username: str = Depends(superadmin_only)):
    """Cambia el plan (Dummy endpoint for frontend compatibility)"""
    return {"status": "success", "new_plan": "pro"}

@router.post("/change_password")
async def change_password(payload: ChangePasswordRequest, username: str = Depends(superadmin_only)):
    old_password = payload.old_password
    new_password = payload.new_password
    
    if not old_password or not new_password:
        raise HTTPException(status_code=400, detail="Se requiere contraseña actual y nueva")
        
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.username == username))
        user = res.scalar()
        if user:

            if not verify_password(old_password, user.password_hash):
                raise HTTPException(status_code=403, detail="Contraseña actual incorrecta")
                
            user.password_hash = get_password_hash(new_password)
            await session.commit()
            return {"status": "success"}
    return {"status": "error"}

@router.post("/update_org/{org_id}")
async def update_org(org_id: int, payload: UpdateOrganizationRequest, username: str = Depends(superadmin_only)):
    """Actualiza los datos de una veterinaria"""
    
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).where(Organization.id == org_id))
        org = org_res.scalar()
        if not org:
            raise HTTPException(status_code=404, detail="Organización no encontrada")
            
        # Update fields
        if payload.name is not None: org.name = payload.name
        if payload.slug is not None: org.slug = payload.slug
        if payload.evolution_api_url is not None: org.evolution_api_url = payload.evolution_api_url
        if payload.evolution_api_key is not None: org.evolution_api_key = payload.evolution_api_key
        if payload.evolution_instance is not None: org.evolution_instance = payload.evolution_instance
        if payload.openai_api_key is not None: org.openai_api_key = payload.openai_api_key
        if payload.google_calendar_id is not None: org.google_calendar_id = payload.google_calendar_id
        
        await session.commit()
        
        # Invalidate cache

        await redis_client.redis.delete(f"org:config:{org.slug}")
        
    return {"status": "success"}

@router.delete("/delete_user/{user_id}")
async def delete_user(user_id: int, username: str = Depends(superadmin_only)):
    """Elimina un usuario (No se puede eliminar al propio superadmin activo)"""
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.id == user_id))
        user = res.scalar()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        if user.username == username:
            raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
            
        await session.delete(user)
        await session.commit()
        logger.info("Usuario %d eliminado por superadmin '%s'", user_id, username)
    return {"status": "success"}

@router.post("/reset_user_password/{user_id}")
async def reset_user_password(user_id: int, payload: ChangePasswordRequest, username: str = Depends(superadmin_only)):
    """Resetea la contraseña de un usuario de veterinaria"""
    new_password = payload.new_password
    if not new_password:
        raise HTTPException(status_code=400, detail="Se requiere nueva contraseña")
        
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(User).where(User.id == user_id))
        user = res.scalar()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
            

        user.password_hash = get_password_hash(new_password)
        await session.commit()
    return {"status": "success"}

@router.delete("/delete_org/{org_id}")
async def delete_org(org_id: int, username: str = Depends(superadmin_only)):
    """Elimina una organización y todos sus datos dependientes."""

    
    async with AsyncSessionLocal() as session:
        # Check if org exists
        org_res = await session.execute(select(Organization).where(Organization.id == org_id))
        org = org_res.scalar()
        if not org:
            raise HTTPException(status_code=404, detail="Organización no encontrada")

        try:
            # Manual cascade delete for safety
            await session.execute(delete(Ticket).where(Ticket.org_id == org_id))
            await session.execute(delete(MedicalAttention).where(MedicalAttention.org_id == org_id))
            await session.execute(delete(DigitalCertificate).where(DigitalCertificate.org_id == org_id))
            await session.execute(delete(Vaccination).where(Vaccination.org_id == org_id))
            await session.execute(delete(ClinicalRecord).where(ClinicalRecord.org_id == org_id))
            await session.execute(delete(Appointment).where(Appointment.org_id == org_id))
            await session.execute(delete(Patient).where(Patient.org_id == org_id))
            await session.execute(delete(Owner).where(Owner.org_id == org_id))
            await session.execute(delete(Service).where(Service.org_id == org_id))
            await session.execute(delete(User).where(User.org_id == org_id))
            
            await session.delete(org)
            await session.commit()

            # Clear Redis Cache
            await redis_client.redis.delete(f"org:config:{org.slug}")
            logger.info("Organización %d eliminada completamente por superadmin '%s'", org_id, username)

            return {"status": "success"}
        except Exception as e:
            await session.rollback()
            logger.exception("Error al eliminar organización %d: %s", org_id, str(e))
            raise HTTPException(status_code=500, detail=str(e))

@router.post("/register_webhook/{org_id}")
async def register_webhook(org_id: int, request: Request, username: str = Depends(superadmin_only)):
    """Sincroniza el webhook de la clínica con Evolution API"""

    
    # Get base URL of our FastAPI server from request
    base_url = str(request.base_url).rstrip('/')
    
    async with AsyncSessionLocal() as session:
        org_res = await session.execute(select(Organization).where(Organization.id == org_id))
        org = org_res.scalar()
        if not org:
            raise HTTPException(status_code=404, detail="Organización no encontrada")
            
        evo_url = org.evolution_api_url
        evo_key = org.evolution_api_key
        evo_instance = org.evolution_instance
        
        if not evo_url or not evo_key or not evo_instance:
            raise HTTPException(status_code=400, detail="Faltan credenciales de Evolution API en esta clínica")

        webhook_target_url = f"{base_url}/webhook/{org.slug}"
        
        # Build Evolution API Payload
        payload = {
            "webhook": {
                "enabled": True,
                "url": webhook_target_url,
                "byEvents": False,
                "base64": False,
                "events": [
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE"
                ]
            }
        }
        
        headers = {
            "apikey": evo_key,
            "Content-Type": "application/json"
        }
        
        try:
            # We use set endpoint for Evolution API v2 to configure the webhook
            evo_endpoint = f"{evo_url.rstrip('/')}/webhook/set/{evo_instance}"
            async with httpx.AsyncClient() as client:
                resp = await client.post(evo_endpoint, json=payload, headers=headers, timeout=10.0)
                
                # If instance does not exist, try to create it first
                if resp.status_code == 404 and "does not exist" in resp.text:
                    create_payload = {
                        "instanceName": evo_instance,
                        "token": evo_instance,
                        "qrcode": True,
                        "integration": "WHATSAPP-BAILEYS"
                    }
                    create_endpoint = f"{evo_url.rstrip('/')}/instance/create"
                    create_resp = await client.post(create_endpoint, json=create_payload, headers=headers, timeout=10.0)
                    
                    if create_resp.status_code >= 400:
                        raise HTTPException(status_code=create_resp.status_code, detail=f"Error creando instancia en Evolution API: {create_resp.text}")
                    
                    # Retry webhook set after creation
                    resp = await client.post(evo_endpoint, json=payload, headers=headers, timeout=10.0)

                if resp.status_code >= 400:
                    raise HTTPException(status_code=resp.status_code, detail=f"Error en Evolution API: {resp.text}")
                    
                return {"status": "success", "message": "Webhook configurado exitosamente", "evolution_response": resp.json()}
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error de conexión con Evolution API: {str(e)}")
