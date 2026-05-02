from pydantic import BaseModel, Field
from typing import Optional, List


class MedicationCreateRequest(BaseModel):
    medicine_name: str = Field(..., min_length=1, max_length=100)
    dosage: Optional[str] = Field(None, max_length=50)
    reminder_time: Optional[str] = Field(
        None,
        pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$",
        description="HH:MM format",
    )
    frequency: str = Field(
        "Daily",
        pattern=r"^(Daily|Weekly|Twice Daily|As Needed|Every 8 Hours|Every 12 Hours)$",
    )
    instructions: Optional[str] = Field(None, max_length=500)


class MedicationUpdateRequest(BaseModel):
    medicine_name: Optional[str] = Field(None, min_length=1, max_length=100)
    dosage: Optional[str] = None
    reminder_time: Optional[str] = None
    frequency: Optional[str] = None
    instructions: Optional[str] = None
    is_active: Optional[bool] = None


class MedicationResponse(BaseModel):
    id: int
    medicine_name: str
    dosage: Optional[str]
    reminder_time: Optional[str]
    frequency: str
    instructions: Optional[str]
    is_active: bool
    created_at: str

    model_config = {"from_attributes": True}


class MedicationListResponse(BaseModel):
    medications: List[MedicationResponse]
    count: int
    active: int
