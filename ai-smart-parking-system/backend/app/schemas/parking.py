from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.models.entities import CameraType, SessionStatus


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    username: str
    password: str


class CameraCreate(BaseModel):
    camera_name: str
    camera_type: CameraType
    rtsp_url: str | None = None


class CameraRead(CameraCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class VehicleRead(BaseModel):
    id: int
    plate_number: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class InvoiceData(BaseModel):
    session_id: int
    plate_number: str
    duration_minutes: int
    base_fee: int
    included_minutes: int
    additional_hourly_fee: int
    additional_hours: int
    total_fee: float


class ParkingSessionRead(BaseModel):
    id: int
    vehicle_id: int
    plate_number: str
    entry_time: datetime
    exit_time: datetime | None
    duration_minutes: int | None
    fee_amount: float | None
    status: SessionStatus
    entry_image_path: str | None
    exit_image_path: str | None
    entry_camera_id: int | None
    exit_camera_id: int | None


class SessionListResponse(BaseModel):
    items: list[ParkingSessionRead]
    total: int


class DetectionResponse(BaseModel):
    session: ParkingSessionRead
    detected_plate: str
    detection_confidence: float = Field(ge=0, le=1)
    ocr_confidence: float = Field(ge=0, le=1)
    invoice: InvoiceData | None = None


class DashboardStats(BaseModel):
    active_count: int
    completed_count: int
    paid_count: int
    unpaid_count: int
    occupancy_percent: float
    total_capacity: int
    revenue_today: float
    revenue_total: float
    daily_revenue: list[dict[str, str | float]]


class PaymentUpdate(BaseModel):
    paid: bool = True
