from pydantic import BaseModel
from typing import Optional

class CreateOrganizationRequest(BaseModel):
    name: str
    slug: Optional[str] = None
    admin_username: str
    admin_password: str
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    evolution_instance: Optional[str] = None
    openai_api_key: Optional[str] = None

class UpdateWhatsappConfigRequest(BaseModel):
    evolution_instance: str
    evolution_apikey: str

class UpdateOrganizationRequest(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None
    evolution_instance: Optional[str] = None
    openai_api_key: Optional[str] = None
    google_calendar_id: Optional[str] = None

class UpdateOrgConfig(BaseModel):
    color_principal: Optional[str] = None
    color_secundario: Optional[str] = None

class UpdateAIContextRequest(BaseModel):
    prompt: str
