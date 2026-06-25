# AI Service

`PlateReader` uses YOLO for number-plate localization and EasyOCR for text extraction.

Place a trained plate detector at the path configured by `YOLO_MODEL_PATH`, for example:

```text
backend/models/license_plate.pt
```

If the model is missing, the service logs a warning and runs OCR on the full frame. That keeps local development and API testing usable while production deployments can mount the trained model.
