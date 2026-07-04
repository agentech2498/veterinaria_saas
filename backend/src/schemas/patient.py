from pydantic import BaseModel
from typing import Optional

class PatientRequest(BaseModel):
    name: Optional[str] = None
    species: Optional[str] = None
    breed: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    sex: Optional[str] = None
    birth_date: Optional[str] = None

class CreateClinicalRecordRequest(BaseModel):
    patient_id: int
    description: Optional[str] = None

class UpdateClinicalRecordRequest(BaseModel):
    description: Optional[str] = None

class CreateVaccinationRequest(BaseModel):
    patient_id: int
    vaccine_name: str
    next_dose_date: Optional[str] = None
    batch_number: Optional[str] = None
    is_signed: Optional[bool] = False

class UpdateVaccinationRequest(BaseModel):
    vaccine_name: Optional[str] = None
    next_dose_date: Optional[str] = None
