import asyncio
from sqlalchemy import select
from src.core.database import AsyncSessionLocal
from src.models.models import User, Organization, Patient, ProfessionalIdentity
from src.services.document_engine import ClinicData, VetIdentity, PatientData, VaccineData, VaccineBuilder

async def main():
    async with AsyncSessionLocal() as session:
        pat_res = await session.execute(select(Patient).limit(1))
        patient = pat_res.scalar()
        if not patient:
            print("No patient found")
            return
            
        clinic_data = ClinicData(name="Test Clinic", address="Test Address", phone="123456")
        vet_data = VetIdentity(name="Test Vet", license_number="123", signature_url=None, stamp_url=None, badge_url=None, professional_title="Vet")
        patient_data = PatientData(name=patient.name, species=patient.species, breed=patient.breed, sex=patient.sex, birth_date=patient.birth_date, weight=patient.weight, owner_name="Owner")
        
        builder = VaccineBuilder(clinic_data, vet_data, patient_data, [])
        pdf_bytes = builder.generate()
        print(f"Successfully generated PDF of size {len(pdf_bytes)}")

asyncio.run(main())
