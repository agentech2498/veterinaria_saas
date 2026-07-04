from pydantic import BaseModel
from typing import Optional

class ServiceRequest(BaseModel):
    name: str
    price: float
    category: Optional[str] = "General"
    description: Optional[str] = None
