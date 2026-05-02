from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlertResponse(BaseModel):
    id: str
    severity: str
    title: str
    description: str
    timestamp: datetime
    is_read: bool
