from math import ceil
from app.core.config import get_settings
from app.schemas.parking import InvoiceData


def calculate_fee(duration_minutes: int) -> tuple[float, int]:
    settings = get_settings()
    billable_minutes = max(0, duration_minutes - settings.included_minutes)
    additional_hours = ceil(billable_minutes / 60) if billable_minutes else 0
    fee = settings.base_fee + additional_hours * settings.additional_hourly_fee
    return float(fee), additional_hours


def build_invoice(session_id: int, plate_number: str, duration_minutes: int) -> InvoiceData:
    settings = get_settings()
    fee, additional_hours = calculate_fee(duration_minutes)
    return InvoiceData(
        session_id=session_id,
        plate_number=plate_number,
        duration_minutes=duration_minutes,
        base_fee=settings.base_fee,
        included_minutes=settings.included_minutes,
        additional_hourly_fee=settings.additional_hourly_fee,
        additional_hours=additional_hours,
        total_fee=fee,
    )
