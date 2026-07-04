import logging
from fastapi import APIRouter, Request, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, delete
from datetime import datetime
import io
import csv
import uuid
import mimetypes

logger = logging.getLogger(__name__)

from src.core.database import AsyncSessionLocal
from src.core.security import admin_required
from src.core.dependencies import get_org
from src.models.models import User, Organization, Patient, Service, Appointment, ClinicalRecord, Vaccination
from src.schemas.patient import PatientRequest, CreateClinicalRecordRequest, CreateVaccinationRequest, UpdateClinicalRecordRequest, UpdateVaccinationRequest
from src.schemas.service import ServiceRequest
from src.schemas.appointment import CreateAppointmentRequest, UpdateAppointmentStatusRequest
from src.schemas.organization import UpdateOrgConfig
from src.schemas.auth import ChangePasswordRequest
from src.services.storage import storage_service
from src.services.image_processor import process_firma_sello
from src.core.security import get_password_hash, verify_password

router = APIRouter(prefix="/admin", dependencies=[Depends(admin_required)])


@router.get("/")
async def admin_dashboard(username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        if not row: raise HTTPException(status_code=404)
        user, org = row
        
        # 1. Resumen Dashboard (Citas recientes)
        recent_res = await session.execute(
            select(Appointment, Owner)
            .join(Owner, Appointment.owner_id == Owner.id)
            .where(Appointment.org_id == org.id)
            .order_by(Appointment.date.desc())
            .limit(5)
        )
        
        # 2. Todas las Citas (Optimized)
        # Count
        count_app_res = await session.execute(select(func.count()).select_from(Appointment).where(Appointment.org_id == org.id))
        total_appointments = count_app_res.scalar() or 0
        
        # List (Limit 50)
        all_app_res = await session.execute(
            select(Appointment, Owner)
            .join(Owner, Appointment.owner_id == Owner.id)
            .where(Appointment.org_id == org.id)
            .order_by(Appointment.date.desc())
            .limit(50)
        )
        
        # 3. Todos los Pacientes (Optimized)
        # Count
        count_pat_res = await session.execute(select(func.count()).select_from(Patient).where(Patient.org_id == org.id))
        total_patients = count_pat_res.scalar() or 0

        # List (Limit 50)
        pat_all_res = await session.execute(
            select(Patient, Owner)
            .join(Owner, Patient.owner_id == Owner.id)
            .where(Patient.org_id == org.id)
            .order_by(Patient.name)
            .limit(50)
        )

        # 4. Todos los Servicios
        services_res = await session.execute(
            select(Service)
            .where(Service.org_id == org.id)
            .order_by(Service.category, Service.name)
        )
        
        # Helper function to convert models to dicts safely
        def to_dict(obj):
            if not obj: return None
            return {c.name: getattr(obj, c.name) for c in obj.__table__.columns if c.name not in ['password_hash']}

        return {
            "org": to_dict(org),
            "user": to_dict(user),
            "recent_appointments": [
                {"appointment": to_dict(a), "owner": to_dict(o)} for a, o in recent_res.all()
            ],
            "all_appointments": [
                {"appointment": to_dict(a), "owner": to_dict(o)} for a, o in all_app_res.all()
            ],
            "total_appointments": total_appointments,
            "patients": [
                {"patient": to_dict(p), "owner": to_dict(o)} for p, o in pat_all_res.all()
            ],
            "patients_count": total_patients,
            "services": [to_dict(s) for s in services_res.scalars().all()]
        }

@router.post("/change_password")
async def change_password(payload: ChangePasswordRequest, username: str = Depends(admin_required)):
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


@router.post("/update_patient/{patient_id}")
async def update_patient(patient_id: int, payload: PatientRequest, username: str = Depends(admin_required)):
    
    async with AsyncSessionLocal() as session:
        user, org = await get_org(username, session)

        # Get patient and ensure it belongs to this org
        pat_res = await session.execute(
            select(Patient).where(Patient.id == patient_id, Patient.org_id == org.id)
        )
        patient = pat_res.scalar()
        if not patient: raise HTTPException(status_code=404, detail="Paciente no encontrado")

        # Update fields
        patient.name = payload.name
        patient.species = payload.species
        patient.breed = payload.breed
        patient.weight = payload.weight
        patient.height = payload.height
        patient.sex = payload.sex
        
        # Handle birth_date correctly
        bd_str = payload.birth_date
        if bd_str:
            try:
                patient.birth_date = datetime.strptime(bd_str, "%Y-%m-%d")
            except Exception as e:
                logger.warning("Error parsing birth_date '%s': %s", bd_str, e)
        else:
            patient.birth_date = None

        await session.commit()
        return {"status": "success", "message": "Datos del paciente actualizados"}

@router.get("/patient_data/{patient_id}")
async def get_patient_detail_data(patient_id: int, username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        # Get org
        row = await get_org(username, session)
        if not row: raise HTTPException(status_code=404)
        user, org = row

        # Get patient
        pat_res = await session.execute(
            select(Patient).where(Patient.id == patient_id, Patient.org_id == org.id)
        )
        patient = pat_res.scalar()
        if not patient: raise HTTPException(status_code=404)

        # Get records
        rec_res = await session.execute(
            select(ClinicalRecord).where(ClinicalRecord.patient_id == patient_id).order_by(ClinicalRecord.created_at.desc())
        )
        records = rec_res.scalars().all()

        # Get vaccinations
        vac_res = await session.execute(
            select(Vaccination).where(Vaccination.patient_id == patient_id).order_by(Vaccination.date_administered.desc())
        )
        vaccinations = vac_res.scalars().all()

        return {
            "patient": {
                "id": patient.id,
                "name": patient.name,
                "species": patient.species,
                "breed": patient.breed,
                "birth_date": patient.birth_date.strftime("%Y-%m-%d") if patient.birth_date else None,
                "weight": patient.weight,
                "height": patient.height,
                "sex": patient.sex
            },
            "records": [
                {"id": r.id, "date": r.created_at.strftime("%d/%m/%Y %H:%M"), "description": r.description, "vet_name": r.vet_name} 
                for r in records
            ],
            "vaccinations": [
                {
                    "id": v.id, 
                    "vaccine_name": v.vaccine_name, 
                    "date": v.date_administered.strftime("%d/%m/%Y"),
                    "next_dose": v.next_dose_date.strftime("%d/%m/%Y") if v.next_dose_date else "N/A",
                    "is_signed": v.is_signed,
                    "batch_number": v.batch_number
                } 
                for v in vaccinations
            ]
        }

@router.post("/add_clinical_record")
async def add_clinical_record(payload: CreateClinicalRecordRequest, username: str = Depends(admin_required)):
    patient_id = payload.patient_id
    description = payload.description
    
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        # Verify ownership (Defensive casting and logging)
        logger.debug("add_clinical_record - patient_id: %s (%s)", patient_id, type(patient_id).__name__)
        pat_res = await session.execute(
            select(Patient).where(Patient.id == patient_id, Patient.org_id == org.id)
        )
        if not pat_res.scalar(): raise HTTPException(status_code=403)
        
        new_rec = ClinicalRecord(
            org_id=org.id,
            patient_id=patient_id,
            description=description,
            vet_name=username
        )
        session.add(new_rec)
        await session.commit()
        return {"status": "success"}

@router.post("/add_vaccination")
async def add_vaccination(payload: CreateVaccinationRequest, username: str = Depends(admin_required)):
    patient_id = payload.patient_id
    vaccine_name = payload.vaccine_name
    next_dose_date = payload.next_dose_date
    
    # Digital Docs Fields
    batch_number = payload.batch_number
    is_signed = payload.is_signed
    
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        # Verify ownership
        pat_res = await session.execute(
            select(Patient).where(Patient.id == patient_id, Patient.org_id == org.id)
        )
        if not pat_res.scalar(): raise HTTPException(status_code=403)
        
        # Validate Signature flag — firma digital disponible para todos
        if is_signed:
            # Validate Digital Signature/Stamp
            # Trust the flag + auth
            pass
        
        next_dt = None
        if next_dose_date:
            try: 
                next_dt = datetime.strptime(next_dose_date, "%Y-%m-%d")
            except Exception as e:
                logger.warning("Error parsing next_dose_date '%s': %s", next_dose_date, e)

        new_vac = Vaccination(
            org_id=org.id,
            patient_id=patient_id,
            vaccine_name=vaccine_name,
            next_dose_date=next_dt,
            batch_number=batch_number,
            is_signed=is_signed,
            signed_at=datetime.now() if is_signed else None,
            signature_data=f"Firmado por: {user.full_name or user.username} - Mat: {user.license_number or '---'}" if is_signed else None,
            vet_stamp=f"{user.full_name}\nMat. {user.license_number}" if is_signed else None,
            signature_hash=user.signature_img or user.stamp_img if is_signed else None
        )
        session.add(new_vac)
        await session.commit()
        return {"status": "success"}

@router.post("/update_clinical_record/{record_id}")
async def update_clinical_record(record_id: int, payload: UpdateClinicalRecordRequest, username: str = Depends(admin_required)):
    description = payload.description
    
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        rec_res = await session.execute(select(ClinicalRecord).where(ClinicalRecord.id == record_id, ClinicalRecord.org_id == org.id))
        record = rec_res.scalar()
        if not record: raise HTTPException(status_code=404)
        
        record.description = description
        await session.commit()
        return {"status": "success"}

@router.post("/update_vaccination/{vac_id}")
async def update_vaccination(vac_id: int, payload: UpdateVaccinationRequest, username: str = Depends(admin_required)):
    vaccine_name = payload.vaccine_name
    next_dose_date = payload.next_dose_date
    
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        vac_res = await session.execute(select(Vaccination).where(Vaccination.id == vac_id, Vaccination.org_id == org.id))
        vaccination = vac_res.scalar()
        if not vaccination: raise HTTPException(status_code=404)
        
        vaccination.vaccine_name = vaccine_name
        if next_dose_date:
            try: 
                vaccination.next_dose_date = datetime.strptime(next_dose_date, "%Y-%m-%d")
            except Exception as e:
                logger.warning("Error parsing next_dose_date update '%s': %s", next_dose_date, e)
        else:
            vaccination.next_dose_date = None
            
        await session.commit()
        return {"status": "success"}

@router.post("/add_appointment")
async def add_appointment(payload: CreateAppointmentRequest, username: str = Depends(admin_required)):
    pet_name = payload.pet_name
    owner_phone = payload.owner_phone
    owner_name = payload.owner_name
    reason = payload.reason
    date_str = payload.date
    
    if not pet_name or not owner_phone or not date_str:
        raise HTTPException(status_code=400, detail="Faltan datos obligatorios")
        
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        try:
            dt = datetime.fromisoformat(date_str)
        except Exception:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido")
            
        owner_res = await session.execute(
            select(Owner).where(Owner.phone_number == owner_phone, Owner.org_id == org.id)
        )
        owner = owner_res.scalar()
        if not owner:
            owner = Owner(name=owner_name or owner_phone, phone_number=owner_phone, org_id=org.id)
            session.add(owner)
            await session.commit()
            await session.refresh(owner)
            
        pat_res = await session.execute(
            select(Patient).where(Patient.name == pet_name, Patient.owner_id == owner.id, Patient.org_id == org.id)
        )
        patient = pat_res.scalar()
        if not patient:
            patient = Patient(name=pet_name, species="No especificada", owner_id=owner.id, org_id=org.id)
            session.add(patient)
            await session.commit()
            await session.refresh(patient)
            
        appointment = Appointment(
            org_id=org.id,
            pet_name=pet_name,
            reason=reason,
            owner_id=owner.id,
            date=dt,
            status="confirmed"
        )
        session.add(appointment)
        await session.commit()
        return {"status": "success", "message": "Cita creada exitosamente"}

@router.post("/update_appointment_status/{appointment_id}")
async def update_appointment_status(appointment_id: int, payload: UpdateAppointmentStatusRequest, username: str = Depends(admin_required)):
    new_status = payload.status
    
    if new_status not in ["confirmed", "attended", "waiting", "cancelled"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
        
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        app_res = await session.execute(
            select(Appointment).where(Appointment.id == appointment_id, Appointment.org_id == org.id)
        )
        appointment = app_res.scalar()
        if not appointment: raise HTTPException(status_code=404)
        
        appointment.status = new_status
        await session.commit()
        return {"status": "success", "message": f"Estado de la cita actualizado a {new_status}"}

@router.delete("/delete_patient/{patient_id}")
async def delete_patient(patient_id: int, username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        # Verify ownership and get patient
        pat_res = await session.execute(
            select(Patient).where(Patient.id == patient_id, Patient.org_id == org.id)
        )
        patient = pat_res.scalar()
        if not patient: raise HTTPException(status_code=404, detail="Paciente no encontrado")
        
        # Delete related records before deleting the patient
        await session.execute(delete(ClinicalRecord).where(ClinicalRecord.patient_id == patient_id))
        await session.execute(delete(Vaccination).where(Vaccination.patient_id == patient_id))
        
        # Now delete the patient
        await session.delete(patient)
        await session.commit()
        
        return {"status": "success", "message": "Paciente y registros relacionados eliminados correctamente"}

@router.post("/add_service")
async def add_service(payload: ServiceRequest, username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        new_service = Service(
            org_id=org.id,
            name=payload.name,
            price=payload.price,
            category=payload.category,
            description=payload.description
        )
        session.add(new_service)
        await session.commit()
        return {"status": "success", "message": "Servicio creado"}

@router.post("/update_service/{service_id}")
async def update_service(service_id: int, payload: ServiceRequest, username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        res = await session.execute(select(Service).where(Service.id == service_id, Service.org_id == org.id))
        service = res.scalar()
        if not service: raise HTTPException(status_code=404)
        
        service.name = payload.name
        service.price = payload.price
        service.category = payload.category
        service.description = payload.description
        
        await session.commit()
        return {"status": "success"}

@router.delete("/delete_service/{service_id}")
async def delete_service(service_id: int, username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        res = await session.execute(select(Service).where(Service.id == service_id, Service.org_id == org.id))
        service = res.scalar()
        if not service: raise HTTPException(status_code=404)
        
        await session.delete(service)
        await session.commit()
        return {"status": "success"}
@router.get("/export_patients_csv")
async def export_patients_csv(username: str = Depends(admin_required)):
    async with AsyncSessionLocal() as session:
        row = await get_org(username, session)
        user, org = row
        
        # Fetch patients with their owners
        res = await session.execute(
            select(Patient, Owner)
            .join(Owner, Patient.owner_id == Owner.id)
            .where(Patient.org_id == org.id)
            .order_by(Patient.name)
        )
        data = res.all()
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(["Nombre Mascota", "Especie", "Raza", "Sexo", "Fecha Nacimiento", "Peso (kg)", "Altura (cm)", "Dueño", "Teléfono Dueño"])
        
        for p, o in data:
            writer.writerow([
                p.name,
                p.species,
                p.breed or "-",
                p.sex or "-",
                p.birth_date or "-",
                p.weight or "-",
                p.height or "-",
                o.name or "-",
                o.phone_number or "-"
            ])
            
        output.seek(0)
        
        headers = {
            'Content-Disposition': f'attachment; filename="backup_pacientes_{datetime.now().strftime("%Y%m%d")}.csv"'
        }
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8-sig')),
            media_type="text/csv",
            headers=headers
        )


@router.post("/update_profile")
async def update_profile(
    full_name: str = Form(...),
    license_number: str = Form(None),
    signature: UploadFile = File(None),
    username: str = Depends(admin_required)
):
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.username == username))
        user = user_res.scalar()
        if not user: raise HTTPException(status_code=404)
        
        user.full_name = full_name
        user.license_number = license_number
        
        if signature and signature.filename:
            file_bytes = await signature.read()
            ext = mimetypes.guess_extension(signature.content_type) or ".png"
            # Limit to images only
            if "image" not in signature.content_type:
                raise HTTPException(status_code=400, detail="Solo se permiten imágenes para la firma")
                
            path = f"clinics/{user.org_id}/signatures/{user.id}_{uuid.uuid4().hex[:8]}{ext}"
            # Subir a supabase (asumiendo que storage_service soporta un bucket particular si modificas el init o se ajusta a "certificados")
            # Usaremos el bucket por defecto que tiene storage_service
            res, err = storage_service.upload_file(file_bytes, path, signature.content_type)
            if err:
                logger.error("Error uploading firma for user %s: %s", user.id, err)
                raise HTTPException(status_code=500, detail="Error al subir la imagen de la firma")
                
            public_url = storage_service.get_public_url(path)
            if public_url:
                user.signature_img = public_url
                user.stamp_img = public_url # Guardamos en los dos campos por conveniencia
        
        await session.commit()

@router.post("/upload_firma")
async def upload_firma(
    firma_file: UploadFile = File(...),
    username: str = Depends(admin_required)
):
    logger.debug("upload_firma started for user '%s'", username)
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.username == username))
        user = user_res.scalar()
        if not user: raise HTTPException(status_code=404)
        
        # Format Check
        if firma_file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
            raise HTTPException(status_code=400, detail="Formato no permitido. Use JPG, PNG o WEBP.")
            
        file_bytes = await firma_file.read()
        
        # Size Check
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo excede los 5MB permitidos.")
            
        try:
            # Pipiline: Resize, BG remove, optimize -> bytes
            processed_bytes = process_firma_sello(file_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error procesando la imagen: {e}")
            
        # Storage - Use user.id for signatures to avoid overwrites
        path = f"clinics/{user.org_id}/signatures/u_{user.id}_{uuid.uuid4().hex[:8]}.png"
        res, err = storage_service.upload_file(processed_bytes, path, "image/png")
        if err:
            raise HTTPException(status_code=500, detail="Error al subir la imagen procesada")
            
        public_url = storage_service.get_public_url(path)
        
        # Update User Signature (instead of Org) - Consistent with Profile View
        user.signature_img = public_url
            
        await session.commit()
        return {"status": "success", "url": public_url}

@router.post("/upload_sello")
async def upload_sello(
    sello_file: UploadFile = File(...),
    username: str = Depends(admin_required)
):
    logger.debug("upload_sello started for user '%s', file: %s", username, sello_file.filename)
    async with AsyncSessionLocal() as session:
        user_res = await session.execute(select(User).where(User.username == username))
        user = user_res.scalar()
        if not user: raise HTTPException(status_code=404)
        
        if sello_file.content_type not in ["image/jpeg", "image/png", "image/webp", "image/jpg"]:
            raise HTTPException(status_code=400, detail="Formato no permitido. Use JPG, PNG o WEBP.")
            
        file_bytes = await sello_file.read()
        
        if len(file_bytes) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo excede los 5MB permitidos.")
            
        try:
            processed_bytes = process_firma_sello(file_bytes)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error procesando la imagen: {e}")
            
        # Storage - Use uuid for stamps to avoid cache issues
        path = f"clinics/{user.org_id}/seals/sello_{uuid.uuid4().hex[:8]}.png"

        res, err = storage_service.upload_file(processed_bytes, path, "image/png")
        if err:
            raise HTTPException(status_code=500, detail="Error al subir la imagen procesada")
            
        public_url = storage_service.get_public_url(path)
        
        org_res = await session.execute(select(Organization).where(Organization.id == user.org_id))
        org = org_res.scalar()
        if org and public_url:
            org.sello_png_url = public_url
            
        await session.commit()
        return {"status": "success", "url": public_url}

@router.post("/update_colors")
async def update_colors(payload: UpdateOrgConfig, username: str = Depends(admin_required)):
    color_principal = payload.color_principal
    color_secundario = payload.color_secundario
    
    async with AsyncSessionLocal() as session:
        user, org = await get_org(username, session)

        if color_principal:
            org.color_principal = color_principal
        if color_secundario:
            org.color_secundario = color_secundario
        await session.commit()
        return {"status": "success"}
