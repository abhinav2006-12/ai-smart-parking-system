import logging
from pathlib import Path
from uuid import uuid4
from fastapi import UploadFile
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AIProcessor:
    def __init__(self) -> None:
        self.settings = get_settings()
        from ai_service.plate_reader import PlateReader

        self.reader = PlateReader(
            model_path=self.settings.yolo_model_path,
            ocr_languages=self.settings.ocr_language_list,
            detection_confidence=self.settings.detection_confidence,
            ocr_confidence=self.settings.ocr_confidence,
        )

    async def process_upload(self, upload: UploadFile, camera_type: str):
        media_dir = Path(self.settings.media_root) / camera_type.lower()
        media_dir.mkdir(parents=True, exist_ok=True)
        suffix = Path(upload.filename or "frame.jpg").suffix or ".jpg"
        target = media_dir / f"{uuid4().hex}{suffix}"
        target.write_bytes(await upload.read())
        logger.info("Saved upload for %s camera at %s", camera_type, target)
        return self.reader.read_plate_from_media(str(target), saved_image_path=str(target))

    def process_rtsp_snapshot(self, rtsp_url: str, camera_type: str):
        media_dir = Path(self.settings.media_root) / camera_type.lower()
        media_dir.mkdir(parents=True, exist_ok=True)
        target = media_dir / f"{uuid4().hex}.jpg"
        return self.reader.read_plate_from_rtsp(rtsp_url=rtsp_url, snapshot_path=str(target))
