import logging
import re
from dataclasses import dataclass
from pathlib import Path
import cv2
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PlateReadResult:
    plate_number: str
    detection_confidence: float
    ocr_confidence: float
    image_path: str
    bbox: tuple[int, int, int, int] | None = None


class PlateReader:
    def __init__(
        self,
        model_path: str,
        ocr_languages: list[str],
        detection_confidence: float = 0.45,
        ocr_confidence: float = 0.40,
    ) -> None:
        self.model_path = model_path
        self.detection_confidence = detection_confidence
        self.ocr_confidence = ocr_confidence
        self.model = None
        self.reader = None
        self.ocr_languages = ocr_languages or ["en"]
        self._load_model()
        self._load_ocr()

    def _load_model(self) -> None:
        try:
            from ultralytics import YOLO

            if Path(self.model_path).exists():
                self.model = YOLO(self.model_path)
                self.is_vehicle_model = False
            else:
                logger.warning("YOLO model not found at %s. Falling back to yolov8n.pt for vehicle detection.", self.model_path)
                self.model = YOLO("yolov8n.pt")
                self.is_vehicle_model = True
        except Exception:
            logger.exception("Could not load YOLO model. Falling back to full-frame OCR.")
            self.model = None
            self.is_vehicle_model = False

    def _load_ocr(self) -> None:
        try:
            import easyocr

            self.reader = easyocr.Reader(self.ocr_languages, gpu=False)
        except Exception:
            logger.exception("Could not initialize EasyOCR. OCR calls will fail until dependencies/models are available.")
            self.reader = None

    def read_plate_from_rtsp(self, rtsp_url: str, snapshot_path: str) -> PlateReadResult:
        capture = cv2.VideoCapture(rtsp_url)
        ok, frame = capture.read()
        capture.release()
        if not ok or frame is None:
            raise RuntimeError("Could not read frame from RTSP stream")
        Path(snapshot_path).parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(snapshot_path, frame)
        return self.read_plate_from_frame(frame, snapshot_path)

    def read_plate_from_media(self, media_path: str, saved_image_path: str | None = None) -> PlateReadResult:
        image_path = saved_image_path or media_path
        frame = cv2.imread(media_path)
        if frame is None:
            capture = cv2.VideoCapture(media_path)
            ok, frame = capture.read()
            capture.release()
            if not ok or frame is None:
                raise RuntimeError("Uploaded file did not contain a readable image or video frame")
            image_path = saved_image_path or f"{Path(media_path).with_suffix('')}_frame.jpg"
            cv2.imwrite(image_path, frame)
        return self.read_plate_from_frame(frame, image_path)

    def read_plate_from_frame(self, frame: np.ndarray, image_path: str) -> PlateReadResult:
        candidates = self._detect_plate_candidates(frame)
        best_result: PlateReadResult | None = None
        for crop, bbox, det_conf in candidates:
            text, ocr_conf = self._extract_text(crop)
            if not text:
                continue
            result = PlateReadResult(
                plate_number=text,
                detection_confidence=det_conf,
                ocr_confidence=ocr_conf,
                image_path=image_path,
                bbox=bbox,
            )
            if best_result is None or (result.detection_confidence + result.ocr_confidence) > (
                best_result.detection_confidence + best_result.ocr_confidence
            ):
                best_result = result
        if not best_result:
            raise RuntimeError("No license plate text passed confidence filters")
        return best_result

    def _detect_plate_candidates(self, frame: np.ndarray) -> list[tuple[np.ndarray, tuple[int, int, int, int], float]]:
        if self.model is None:
            height, width = frame.shape[:2]
            return [(frame, (0, 0, width, height), 1.0)]
        detections = self.model.predict(frame, conf=self.detection_confidence, verbose=False)
        candidates: list[tuple[np.ndarray, tuple[int, int, int, int], float]] = []
        for detection in detections:
            boxes = getattr(detection, "boxes", None)
            if boxes is None:
                continue
            for box in boxes:
                confidence = float(box.conf[0])
                if confidence < self.detection_confidence:
                    continue
                
                if getattr(self, "is_vehicle_model", False):
                    cls_id = int(box.cls[0])
                    # COCO classes: 2=car, 3=motorcycle, 5=bus, 7=truck
                    if cls_id not in [2, 3, 5, 7]:
                        continue

                x1, y1, x2, y2 = [int(value) for value in box.xyxy[0].tolist()]
                crop = frame[max(0, y1) : max(0, y2), max(0, x1) : max(0, x2)]
                if crop.size:
                    candidates.append((crop, (x1, y1, x2, y2), confidence))
        return candidates

    def _extract_text(self, image: np.ndarray) -> tuple[str, float]:
        if self.reader is None:
            raise RuntimeError("EasyOCR reader is unavailable")
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.bilateralFilter(gray, 11, 17, 17)
        results = self.reader.readtext(gray)
        best_text = ""
        best_conf = 0.0
        for _, text, confidence in results:
            normalized = self._normalize_plate(text)
            if confidence >= self.ocr_confidence and len(normalized) >= 6 and confidence > best_conf:
                best_text = normalized
                best_conf = float(confidence)
        return best_text, best_conf

    @staticmethod
    def _normalize_plate(text: str) -> str:
        return re.sub(r"[^A-Z0-9]", "", text.upper())
