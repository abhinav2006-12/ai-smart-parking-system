import csv
import io
from datetime import date
from typing import Annotated
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload
from app.core.config import get_settings
from app.core.database import get_db
from app.core.security import create_access_token, require_admin
from app.models.entities import Camera, CameraType, ParkingSession, SessionStatus, Vehicle
from app.schemas.parking import (
    CameraCreate,
    CameraRead,
    DashboardStats,
    DetectionResponse,
    LoginRequest,
    PaymentUpdate,
    SessionListResponse,
    TokenResponse,
)
from app.services.ai_client import AIProcessor
from app.services.sessions import close_exit, create_entry, daily_revenue, find_camera, to_session_read


router = APIRouter()
ai_processor: AIProcessor | None = None


def get_ai_processor() -> AIProcessor:
    global ai_processor
    if ai_processor is None:
        ai_processor = AIProcessor()
    return ai_processor


@router.post("/auth/login", response_model=TokenResponse, tags=["auth"])
def login(payload: LoginRequest) -> TokenResponse:
    settings = get_settings()
    if payload.username != settings.admin_username or payload.password != settings.admin_password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return TokenResponse(access_token=create_access_token(payload.username))


@router.post("/cameras", response_model=CameraRead, tags=["cameras"])
def create_camera(payload: CameraCreate, db: Annotated[Session, Depends(get_db)], _: Annotated[str, Depends(require_admin)]) -> Camera:
    camera = Camera(**payload.model_dump())
    db.add(camera)
    db.commit()
    db.refresh(camera)
    return camera


@router.get("/cameras", response_model=list[CameraRead], tags=["cameras"])
def list_cameras(db: Annotated[Session, Depends(get_db)], _: Annotated[str, Depends(require_admin)]) -> list[Camera]:
    return list(db.scalars(select(Camera).order_by(Camera.id)))


@router.post("/entry", response_model=DetectionResponse, tags=["parking"])
async def vehicle_entry(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[str, Depends(require_admin)],
    camera_id: int | None = Form(default=None),
    plate_number: str | None = Form(default=None),
    video: UploadFile | None = File(default=None),
) -> DetectionResponse:
    camera = find_camera(db, camera_id, CameraType.ENTRY)
    if plate_number:
        detected_plate = plate_number
        image_path = None
        detection_confidence = 1.0
        ocr_confidence = 1.0
    elif video:
        result = await get_ai_processor().process_upload(video, "ENTRY")
        detected_plate = result.plate_number
        image_path = result.image_path
        detection_confidence = result.detection_confidence
        ocr_confidence = result.ocr_confidence
    elif camera and camera.rtsp_url:
        result = get_ai_processor().process_rtsp_snapshot(camera.rtsp_url, "ENTRY")
        detected_plate = result.plate_number
        image_path = result.image_path
        detection_confidence = result.detection_confidence
        ocr_confidence = result.ocr_confidence
    else:
        raise HTTPException(status_code=400, detail="Provide plate_number, uploaded video/image, or an ENTRY camera with RTSP URL")

    session = create_entry(db, detected_plate, camera.id if camera else camera_id, image_path)
    return DetectionResponse(
        session=to_session_read(session),
        detected_plate=detected_plate,
        detection_confidence=detection_confidence,
        ocr_confidence=ocr_confidence,
    )


@router.post("/exit", response_model=DetectionResponse, tags=["parking"])
async def vehicle_exit(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[str, Depends(require_admin)],
    camera_id: int | None = Form(default=None),
    plate_number: str | None = Form(default=None),
    video: UploadFile | None = File(default=None),
) -> DetectionResponse:
    camera = find_camera(db, camera_id, CameraType.EXIT)
    if plate_number:
        detected_plate = plate_number
        image_path = None
        detection_confidence = 1.0
        ocr_confidence = 1.0
    elif video:
        result = await get_ai_processor().process_upload(video, "EXIT")
        detected_plate = result.plate_number
        image_path = result.image_path
        detection_confidence = result.detection_confidence
        ocr_confidence = result.ocr_confidence
    elif camera and camera.rtsp_url:
        result = get_ai_processor().process_rtsp_snapshot(camera.rtsp_url, "EXIT")
        detected_plate = result.plate_number
        image_path = result.image_path
        detection_confidence = result.detection_confidence
        ocr_confidence = result.ocr_confidence
    else:
        raise HTTPException(status_code=400, detail="Provide plate_number, uploaded video/image, or an EXIT camera with RTSP URL")

    try:
        session, invoice = close_exit(db, detected_plate, camera.id if camera else camera_id, image_path)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return DetectionResponse(
        session=to_session_read(session),
        detected_plate=detected_plate,
        detection_confidence=detection_confidence,
        ocr_confidence=ocr_confidence,
        invoice=invoice,
    )


@router.get("/sessions", response_model=SessionListResponse, tags=["parking"])
def list_sessions(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[str, Depends(require_admin)],
    status: SessionStatus | None = None,
    plate: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
) -> SessionListResponse:
    stmt = select(ParkingSession).join(Vehicle).options(joinedload(ParkingSession.vehicle)).order_by(ParkingSession.entry_time.desc())
    count_stmt = select(func.count(ParkingSession.id)).join(Vehicle)
    filters = []
    if status:
        filters.append(ParkingSession.status == status)
    if plate:
        filters.append(Vehicle.plate_number.ilike(f"%{plate}%"))
    if filters:
        stmt = stmt.where(*filters)
        count_stmt = count_stmt.where(*filters)
    sessions = db.scalars(stmt.limit(limit).offset(offset)).all()
    return SessionListResponse(items=[to_session_read(item) for item in sessions], total=db.scalar(count_stmt) or 0)


@router.get("/sessions/{session_id}", tags=["parking"])
def get_session(session_id: int, db: Annotated[Session, Depends(get_db)], _: Annotated[str, Depends(require_admin)]):
    session = db.scalar(select(ParkingSession).options(joinedload(ParkingSession.vehicle)).where(ParkingSession.id == session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    invoice = None
    if session.duration_minutes:
        from app.services.billing import build_invoice

        invoice = build_invoice(session.id, session.vehicle.plate_number, session.duration_minutes)
    return {"session": to_session_read(session), "invoice": invoice}


@router.get("/dashboard/stats", response_model=DashboardStats, tags=["dashboard"])
def dashboard_stats(db: Annotated[Session, Depends(get_db)], _: Annotated[str, Depends(require_admin)]) -> DashboardStats:
    settings = get_settings()
    counts = {status.value: db.scalar(select(func.count()).select_from(ParkingSession).where(ParkingSession.status == status)) or 0 for status in SessionStatus}
    today = date.today()
    revenue_today = db.scalar(
        select(func.coalesce(func.sum(ParkingSession.fee_amount), 0)).where(func.date(ParkingSession.exit_time) == today)
    )
    revenue_total = db.scalar(select(func.coalesce(func.sum(ParkingSession.fee_amount), 0)))
    active = counts[SessionStatus.ACTIVE.value]
    return DashboardStats(
        active_count=active,
        completed_count=counts[SessionStatus.COMPLETED.value],
        paid_count=counts[SessionStatus.PAID.value],
        unpaid_count=counts[SessionStatus.UNPAID.value],
        occupancy_percent=round((active / settings.total_capacity) * 100, 2) if settings.total_capacity else 0,
        total_capacity=settings.total_capacity,
        revenue_today=float(revenue_today or 0),
        revenue_total=float(revenue_total or 0),
        daily_revenue=daily_revenue(db),
    )


@router.put("/session/{session_id}/payment", tags=["billing"])
def update_payment(
    session_id: int,
    payload: PaymentUpdate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[str, Depends(require_admin)],
):
    session = db.scalar(select(ParkingSession).options(joinedload(ParkingSession.vehicle)).where(ParkingSession.id == session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == SessionStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Active sessions cannot be marked paid")
    session.status = SessionStatus.PAID if payload.paid else SessionStatus.UNPAID
    db.commit()
    db.refresh(session)
    return to_session_read(session)


@router.get("/reports/daily-revenue", tags=["reports"])
def daily_revenue_report(db: Annotated[Session, Depends(get_db)], _: Annotated[str, Depends(require_admin)]):
    return {"items": daily_revenue(db)}


@router.get("/export/sessions.csv", tags=["reports"])
def export_sessions_csv(db: Annotated[Session, Depends(get_db)], _: Annotated[str, Depends(require_admin)]):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "plate_number", "entry_time", "exit_time", "duration_minutes", "fee_amount", "status"])
    rows = db.scalars(select(ParkingSession).join(Vehicle).options(joinedload(ParkingSession.vehicle)).order_by(ParkingSession.entry_time.desc()))
    for session in rows:
        writer.writerow([
            session.id,
            session.vehicle.plate_number,
            session.entry_time,
            session.exit_time,
            session.duration_minutes,
            float(session.fee_amount or 0),
            session.status.value,
        ])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=parking_sessions.csv"},
    )
