import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from starlette.concurrency import run_in_threadpool
from src.core.database import AsyncSessionLocal
from src.core.security import admin_required
from src.models.models import User, Organization, Patient, Vaccination, ProfessionalIdentity, ClinicalRecord, Owner
from src.services.document_engine import (
    ClinicalHistoryBuilder,
    VaccineBuilder,
    PassportBuilder,
    ClinicData,
    VetIdentity,
    PatientData,
    ClinicalRecordData,
    VaccineData
)
import io
import hashlib
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", dependencies=[Depends(admin_required)])

@router.get("/generate/{doc_type}/{patient_id}")
async def generate_document(doc_type: str, patient_id: int, request: Request, username: str = Depends(admin_required)):
    """
    Generates a standardized PDF document using the Document Engine.
    Supported types: history, vaccines, passport
    """
    if doc_type not in ["history", "vaccines", "passport"]:
        raise HTTPException(status_code=400, detail="Tipo de documento no soportado")

    async with AsyncSessionLocal() as session:
        # 1. Auth & Clinic context
        res = await session.execute(
            select(User, Organization)
            .join(Organization, User.org_id == Organization.id)
            .where(User.username == username)
        )
        row = res.first()
        if not row: raise HTTPException(status_code=401)
        user, org = row

        # 2. Fetch Professional Identity (Single Source of Truth)
        identity_res = await session.execute(select(ProfessionalIdentity).where(ProfessionalIdentity.user_id == user.id))
        identity = identity_res.scalar()

        # 3. Patient Data & Security Check
        pat_res = await session.execute(
            select(Patient, Owner.name.label("owner_name"))
            .outerjoin(Owner, Patient.owner_id == Owner.id)
            .where(Patient.id == patient_id, Patient.org_id == org.id)
        )
        pat_row = pat_res.first()
        if not pat_row: raise HTTPException(status_code=404, detail="Paciente no encontrado")
        patient, owner_name = pat_row

        # Build Common DTOs
        clinic_data = ClinicData(
            name=org.name or "Clínica Veterinaria",
            address=getattr(org, 'address', ''),
            phone=getattr(org, 'phone', '')
        )
        
        vet_name = f"{identity.title or ''} {identity.first_name or ''} {identity.last_name or ''}".strip() if identity else (user.full_name or user.username)
        if not vet_name.strip():
            vet_name = user.username

        vet_data = VetIdentity(
            name=vet_name,
            license_number=identity.license_number if identity else getattr(user, 'license_number', None),
            signature_url=identity.signature_url if identity else getattr(user, 'signature_img', None),
            stamp_url=identity.stamp_url if identity else getattr(user, 'stamp_img', None),
            badge_url=org.sello_png_url if org else None,
            professional_title=identity.title if identity and identity.title else "Médico Veterinario"
        )
        
        patient_data = PatientData(
            name=patient.name,
            species=patient.species,
            breed=patient.breed,
            sex=patient.sex,
            birth_date=patient.birth_date.strftime("%d/%m/%Y") if patient.birth_date else None,
            weight=patient.weight,
            owner_name=owner_name
        )

        # Generate specific document
        pdf_bytes = b""
        filename = ""

        if doc_type == "history":
            rec_res = await session.execute(select(ClinicalRecord).where(ClinicalRecord.patient_id == patient.id).order_by(ClinicalRecord.created_at.desc()))
            records = rec_res.scalars().all()
            
            record_dtos = [ClinicalRecordData(
                date=r.created_at.strftime("%d/%m/%Y"),
                description=r.description,
                vet_name=r.vet_name or vet_data.name
            ) for r in records]
            
            builder = ClinicalHistoryBuilder(clinic_data, vet_data, patient_data, record_dtos)
            pdf_bytes = await run_in_threadpool(builder.generate)
            filename = f"Historia_{patient.name}.pdf"
            logger.info("PDF historial generado: paciente_id=%d registros=%d", patient_id, len(record_dtos))
            
        elif doc_type == "vaccines":
            vac_res = await session.execute(select(Vaccination).where(Vaccination.patient_id == patient.id).order_by(Vaccination.date_administered.desc()))
            vaccines = vac_res.scalars().all()
            
            vaccine_dtos = [VaccineData(
                date=v.date_administered.strftime("%d/%m/%Y") if v.date_administered else "-",
                vaccine_name=v.vaccine_name or "-",
                batch_number=v.batch_number,
                next_dose=v.next_dose_date.strftime("%d/%m/%Y") if getattr(v, 'next_dose_date', None) else "-"
            ) for v in vaccines]
            
            builder = VaccineBuilder(clinic_data, vet_data, patient_data, vaccine_dtos)
            pdf_bytes = await run_in_threadpool(builder.generate)
            filename = f"Vacunas_{patient.name}.pdf"
            logger.info("PDF vacunas generado: paciente_id=%d vacunas=%d", patient_id, len(vaccine_dtos))

        elif doc_type == "passport":
            vac_res = await session.execute(select(Vaccination).where(Vaccination.patient_id == patient.id).order_by(Vaccination.date_administered.desc()))
            vaccines = vac_res.scalars().all()
            
            vaccine_dtos = [VaccineData(
                date=v.date_administered.strftime("%d/%m/%Y") if v.date_administered else "-",
                vaccine_name=v.vaccine_name or "-",
                batch_number=v.batch_number,
                next_dose=v.next_dose_date.strftime("%d/%m/%Y") if getattr(v, 'next_dose_date', None) else "-"
            ) for v in vaccines]
            
            # Generate fake verification URL for now
            unique_str = f"{org.id}-{patient.id}-{datetime.now().isoformat()}-{uuid.uuid4()}"
            cert_hash = hashlib.sha256(unique_str.encode()).hexdigest()[:16]
            verify_url = f"{request.base_url}verify/{cert_hash}"
            
            builder = PassportBuilder(clinic_data, vet_data, patient_data, vaccine_dtos, verify_url)
            pdf_bytes = await run_in_threadpool(builder.generate)
            filename = f"Pasaporte_{patient.name}.pdf"
            logger.info("PDF pasaporte generado: paciente_id=%d vacunas=%d", patient_id, len(vaccine_dtos))

        buffer = io.BytesIO(pdf_bytes)
        buffer.seek(0)
        
        # Determine content disposition based on request type
        # If preview is in query params, show inline. Otherwise attachment.
        disposition = "inline" if request.query_params.get("preview") else "attachment"
        
        return StreamingResponse(
            buffer, 
            media_type="application/pdf", 
            headers={"Content-Disposition": f"{disposition}; filename=\"{filename}\""}
        )
