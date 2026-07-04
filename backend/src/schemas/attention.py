from pydantic import BaseModel
from typing import Optional, List

class CreateAttentionRequest(BaseModel):
    patient_id: int

class UpdateAttentionStatusRequest(BaseModel):
    status: str
    notes: Optional[str] = None

class TicketItemSchema(BaseModel):
    description: str
    price: float
    quantity: Optional[int] = 1

class FinishAttentionRequest(BaseModel):
    items: List[TicketItemSchema]
    payment_method: Optional[str] = "Efectivo"
    notes: Optional[str] = None
