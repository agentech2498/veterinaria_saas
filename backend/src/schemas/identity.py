from pydantic import BaseModel
from typing import Optional

class UpdateIdentityRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    title: Optional[str] = None
    license_number: Optional[str] = None
    professional_registry: Optional[str] = None
    specialty: Optional[str] = None
    university: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    professional_email: Optional[str] = None
    professional_phone: Optional[str] = None
    website: Optional[str] = None
    social_media: Optional[str] = None

class UploadImageBase64Request(BaseModel):
    image: str
