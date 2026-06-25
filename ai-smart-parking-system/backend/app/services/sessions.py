from datetime import datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload
from app.core.config import get_settings
from app.models.entities import Camera, CameraType, ParkingSession, SessionStatus, Vehicle
from app.schemas.parking import ParkingSessionRead
from app.services.billing import build_invoice, calculate_fee


def normalize_plate(plate: str) -> str:
    return "".join(ch for ch in plate.upper() if ch.isalnum())


def to_session_read(session: ParkingSession) -> ParkingSessionRead:
    return ParkingSessionRead(
        id=session.id,
        vehicle_id=session.vehicle_id,
        plate_number=session.vehicle.plate_number,
        entry_time=session.entry_time,
        exit_time=session.exit_time,
        duration_minutes=session.duration_minutes,
        fee_amount=float(session.fee_amount) if session.fee_amount is not None else None,
        status=session.status,
        entry_image_path=session.entry_image_path,
        exit_image_path=session.exit_image_path,
        entry_camera_id=session.entry_camera_id,
        exit_camera_id=session.exit_camera_id,
    )


def get_or_create_vehicle(db: Session, plate_number: str) -> Vehicle:
    normalized = normalize_plate(plate_number)
    vehicle = db.scalar(select(Vehicle).where(Vehicle.plate_number == normalized))
    if vehicle:
        return vehicle
    vehicle = Vehicle(plate_number=normalized)
    db.add(vehicle)
    db.flush()
    return vehicle


def find_camera(db: Session, camera_id: int | None, camera_type: CameraType) -> Camera | None:
    if camera_id:
        return db.get(Camera, camera_id)
    return db.scalar(select(Camera).where(Camera.camera_type == camera_type).order_by(Camera.id))


def has_recent_duplicate(db: Session, vehicle_id: int) -> bool:
    settings = get_settings()
    active = db.scalar(
        select(ParkingSession)
        .where(ParkingSession.vehicle_id == vehicle_id, ParkingSession.status == SessionStatus.ACTIVE)
        .order_by(ParkingSession.entry_time.desc())
    )
    if not active:
        return False
    age = datetime.now(timezone.utc) - active.entry_time
    return age.total_seconds() <= settings.duplicate_window_seconds


def create_entry(db: Session, plate_number: str, camera_id: int | None, image_path: str | None) -> ParkingSession:
    vehicle = get_or_create_vehicle(db, plate_number)
    active = db.scalar(select(ParkingSession).where(ParkingSession.vehicle_id == vehicle.id, ParkingSession.status == SessionStatus.ACTIVE))
    if active:
        return active
    session = ParkingSession(vehicle_id=vehicle.id, entry_camera_id=camera_id, entry_image_path=image_path)
    db.add(session)
    db.commit()
    db.refresh(session)
    session.vehicle = vehicle
    return session


def close_exit(db: Session, plate_number: str, camera_id: int | None, image_path: str | None) -> tuple[ParkingSession, object]:
    normalized = normalize_plate(plate_number)
    session = db.scalar(
        select(ParkingSession)
        .join(Vehicle)
        .options(joinedload(ParkingSession.vehicle))
        .where(Vehicle.plate_number == normalized, ParkingSession.status == SessionStatus.ACTIVE)
        .order_by(ParkingSession.entry_time.desc())
    )
    if not session:
        raise ValueError(f"No active parking session found for plate {normalized}")
    now = datetime.now(timezone.utc)
    duration = max(1, int((now - session.entry_time).total_seconds() // 60))
    fee, _ = calculate_fee(duration)
    session.exit_time = now
    session.duration_minutes = duration
    session.fee_amount = fee
    session.status = SessionStatus.UNPAID
    session.exit_camera_id = camera_id
    session.exit_image_path = image_path
    db.commit()
    db.refresh(session)
    invoice = build_invoice(session.id, session.vehicle.plate_number, duration)
    return session, invoice


def daily_revenue(db: Session) -> list[dict[str, str | float]]:
    rows = db.execute(
        select(func.date(ParkingSession.exit_time), func.coalesce(func.sum(ParkingSession.fee_amount), 0))
        .where(ParkingSession.exit_time.is_not(None))
        .group_by(func.date(ParkingSession.exit_time))
        .order_by(func.date(ParkingSession.exit_time).desc())
        .limit(14)
    ).all()
    return [{"date": str(day), "revenue": float(total)} for day, total in rows]
