from pydantic import BaseModel
from typing import Optional, Dict, Any

class WebhookEvolutionRequest(BaseModel):
    event: str
    instance: str
    data: Dict[str, Any]
    destination: str
    date_time: str
    server_url: str
    apikey: str
