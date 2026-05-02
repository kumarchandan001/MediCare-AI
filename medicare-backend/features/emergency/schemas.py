from pydantic import BaseModel, Field
from typing import Optional, List


class EmergencyContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., min_length=6, max_length=20)
    relationship: str = Field(..., max_length=50)
    is_primary: bool = False
    notes: Optional[str] = Field(None, max_length=200)


class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


class EmergencyContactResponse(BaseModel):
    id: int
    name: str
    phone: str
    relationship: str
    is_primary: bool
    notes: Optional[str]
    created_at: str

    model_config = {"from_attributes": True}


class EmergencyContactListResponse(BaseModel):
    contacts: List[EmergencyContactResponse]
    count: int
    primary: Optional[EmergencyContactResponse]
