from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class ClinicData(BaseModel):
    name: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class VetIdentity(BaseModel):
    name: str
    license_number: Optional[str] = None
    signature_url: Optional[str] = None
    stamp_url: Optional[str] = None
    badge_url: Optional[str] = None
    professional_title: Optional[str] = "Médico Veterinario"

class PatientData(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    sex: Optional[str] = None
    birth_date: Optional[str] = None
    weight: Optional[float] = None
    owner_name: Optional[str] = None

class ClinicalRecordData(BaseModel):
    date: str
    description: str
    vet_name: str

class VaccineData(BaseModel):
    date: str
    vaccine_name: str
    batch_number: Optional[str] = None
    next_dose: Optional[str] = None

class PrescriptionData(BaseModel):
    date: str
    medications: str
    instructions: str
