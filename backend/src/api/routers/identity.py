import logging
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File
from sqlalchemy.future import select
from src.core.database import AsyncSessionLocal
from src.core.security import admin_required
from src.models.models import ProfessionalIdentity, User, Organization
from src.services.storage import storage_service
from src.core.dependencies import get_org
import base64
import uuid
from typing import Optional
from src.schemas.identity import UpdateIdentityRequest, UploadImageBase64Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/identity", tags=["identity"])

@router.get("/")
async def get_identity(username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.username == username))
        user = user_res.scalar()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Org info for the badge
        org_res = await session.execute(select(Organization).where(Organization.id == user.org_id))
        org = org_res.scalar()

        ident_res = await session.execute(select(ProfessionalIdentity).where(ProfessionalIdentity.user_id == user.id))
        identity = ident_res.scalar()

        if not identity:
            # Return empty skeleton
            return {
                "first_name": "",
                "last_name": "",
                "title": "",
                "license_number": "",
                "professional_registry": "",
                "specialty": "",
                "university": "",
                "state": "",
                "country": "",
                "professional_email": "",
                "professional_phone": "",
                "website": "",
                "social_media": "",
                "signature_url": "",
                "stamp_url": "",
                "badge_url": org.sello_png_url if org else ""
            }

        return {
            "first_name": identity.first_name or "",
            "last_name": identity.last_name or "",
            "title": identity.title or "",
            "license_number": identity.license_number or "",
            "professional_registry": identity.professional_registry or "",
            "specialty": identity.specialty or "",
            "university": identity.university or "",
            "state": identity.state or "",
            "country": identity.country or "",
            "professional_email": identity.professional_email or "",
            "professional_phone": identity.professional_phone or "",
            "website": identity.website or "",
            "social_media": identity.social_media or "",
            "signature_url": identity.signature_url or "",
            "stamp_url": identity.stamp_url or "",
            "badge_url": org.sello_png_url if org else ""
        }

@router.put("/")
async def update_identity(payload: UpdateIdentityRequest, username: str = Depends(admin_required)):
    
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.username == username))
        user = user_res.scalar()
        if not user:
            raise HTTPException(status_code=404)

        ident_res = await session.execute(select(ProfessionalIdentity).where(ProfessionalIdentity.user_id == user.id))
        identity = ident_res.scalar()

        if not identity:
            identity = ProfessionalIdentity(user_id=user.id)
            session.add(identity)

        if payload.first_name is not None: identity.first_name = payload.first_name
        if payload.last_name is not None: identity.last_name = payload.last_name
        if payload.title is not None: identity.title = payload.title
        if payload.license_number is not None: identity.license_number = payload.license_number
        if payload.professional_registry is not None: identity.professional_registry = payload.professional_registry
        if payload.specialty is not None: identity.specialty = payload.specialty
        if payload.university is not None: identity.university = payload.university
        if payload.state is not None: identity.state = payload.state
        if payload.country is not None: identity.country = payload.country
        if payload.professional_email is not None: identity.professional_email = payload.professional_email
        if payload.professional_phone is not None: identity.professional_phone = payload.professional_phone
        if payload.website is not None: identity.website = payload.website
        if payload.social_media is not None: identity.social_media = payload.social_media

        # Backwards compatibility sync for PDFs
        user.full_name = f"{identity.title or ''} {identity.first_name or ''} {identity.last_name or ''}".strip()
        user.license_number = identity.license_number

        await session.commit()
        return {"status": "success"}

@router.post("/signature")
async def upload_signature(request: Request, username: str = Depends(admin_required)):
    # Support both Base64 JSON (from Canvas) and Multipart File
    content_type = request.headers.get("content-type", "")
    file_bytes = None
    
    if "application/json" in content_type:
        try:
            payload = UploadImageBase64Request(**await request.json())
            base64_img = payload.image
        except Exception as e:
            raise HTTPException(status_code=422, detail=str(e))
        if not base64_img:
            raise HTTPException(status_code=400, detail="Missing image data")
        
        # Remove data:image/png;base64, if present
        if "," in base64_img:
            base64_img = base64_img.split(",")[1]
            
        file_bytes = base64.b64decode(base64_img)
    else:
        # Expected to be multipart form
        form = await request.form()
        file = form.get("file")
        if not file:
            raise HTTPException(status_code=400, detail="Missing file")
        file_bytes = await file.read()

    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.username == username))
        user = user_res.scalar()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        path = f"clinics/{user.org_id}/signatures/{uuid.uuid4()}.png"
        res, err = storage_service.upload_file(file_bytes, path, "image/png")
        if err:
            logger.error("Error al subir firma para usuario '%s': %s", username, err)
            raise HTTPException(status_code=500, detail=f"Upload failed: {err}")

        public_url = storage_service.get_public_url(path)

        ident_res = await session.execute(select(ProfessionalIdentity).where(ProfessionalIdentity.user_id == user.id))
        identity = ident_res.scalar()
        
        if not identity:
            identity = ProfessionalIdentity(user_id=user.id)
            session.add(identity)
            
        identity.signature_url = public_url
        user.signature_img = public_url # legacy fallback
        
        await session.commit()
        logger.info("Firma actualizada para usuario '%s': %s", username, public_url)

    return {"status": "success", "url": public_url}

@router.post("/stamp")
async def upload_stamp(request: Request, username: str = Depends(admin_required)):
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="Missing file")
        
    file_bytes = await file.read()
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.username == username))
        user = user_res.scalar()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        path = f"clinics/{user.org_id}/seals/{uuid.uuid4()}.png"
        res, err = storage_service.upload_file(file_bytes, path, "image/png")
        if err:
            logger.error("Error al subir sello para usuario '%s': %s", username, err)
            raise HTTPException(status_code=500, detail=f"Upload failed: {err}")

        public_url = storage_service.get_public_url(path)

        ident_res = await session.execute(select(ProfessionalIdentity).where(ProfessionalIdentity.user_id == user.id))
        identity = ident_res.scalar()
        
        if not identity:
            identity = ProfessionalIdentity(user_id=user.id)
            session.add(identity)
            
        identity.stamp_url = public_url
        user.stamp_img = public_url # legacy fallback
        
        await session.commit()
        logger.info("Sello actualizado para usuario '%s': %s", username, public_url)

    return {"status": "success", "url": public_url}

@router.post("/badge")
async def upload_badge(request: Request, username: str = Depends(admin_required)):
    # Org level badge
    form = await request.form()
    file = form.get("file")
    if not file:
        raise HTTPException(status_code=400, detail="Missing file")
        
    file_bytes = await file.read()
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        if not row: raise HTTPException(status_code=404)
        user, org = row

        path = f"clinics/{org.id}/logos/{uuid.uuid4()}.png"
        res, err = storage_service.upload_file(file_bytes, path, "image/png")
        if err:
            logger.error("Error al subir badge para org %d: %s", org.id, err)
            raise HTTPException(status_code=500, detail=f"Upload failed: {err}")

        public_url = storage_service.get_public_url(path)
        
        org.sello_png_url = public_url
        await session.commit()
        logger.info("Badge de org %d actualizado: %s", org.id, public_url)

    return {"status": "success", "url": public_url}
