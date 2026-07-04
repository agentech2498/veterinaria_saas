from pydantic import BaseModel
from typing import Optional

class CreateAppointmentRequest(BaseModel):
    pet_name: str
    owner_phone: str
    owner_name: str
    reason: Optional[str] = ""
    date: str

class UpdateAppointmentStatusRequest(BaseModel):
    status: str
