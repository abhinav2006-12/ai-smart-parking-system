from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import DateTime, Enum as SqlEnum, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CameraType(str, Enum):
    ENTRY = "ENTRY"
    EXIT = "EXIT"


class SessionStatus(str, Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    PAID = "PAID"
    UNPAID = "UNPAID"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plate_number: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    sessions: Mapped[list["ParkingSession"]] = relationship(back_populates="vehicle")


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    camera_name: Mapped[str] = mapped_column(String(120), nullable=False)
    camera_type: Mapped[CameraType] = mapped_column(SqlEnum(CameraType), nullable=False)
    rtsp_url: Mapped[str | None] = mapped_column(Text, nullable=True)


class ParkingSession(Base):
    __tablename__ = "parking_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False, index=True)
    entry_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    exit_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    fee_amount: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(SqlEnum(SessionStatus), default=SessionStatus.ACTIVE, index=True)
    entry_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    exit_image_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    entry_camera_id: Mapped[int | None] = mapped_column(ForeignKey("cameras.id"), nullable=True)
    exit_camera_id: Mapped[int | None] = mapped_column(ForeignKey("cameras.id"), nullable=True)

    vehicle: Mapped[Vehicle] = relationship(back_populates="sessions")
    entry_camera: Mapped[Camera | None] = relationship(foreign_keys=[entry_camera_id])
    exit_camera: Mapped[Camera | None] = relationship(foreign_keys=[exit_camera_id])
