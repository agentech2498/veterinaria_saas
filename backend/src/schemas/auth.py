from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class SignupRequest(BaseModel):
    org_name: str
    username: str
    password: str
    email: Optional[str] = None
    cuit: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    old_password: Optional[str] = None
    new_password: str
