from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {
        "status": "Backend Running",
        "message": "Smart Parking AI Server"
    }

@app.post("/detect")
async def detect(file: UploadFile = File(...)):
    data = await file.read()

    image = cv2.imdecode(
        np.frombuffer(data, np.uint8),
        cv2.IMREAD_COLOR
    )

    if image is None:
        return {
            "success": False,
            "message": "Image not received"
        }

    h, w = image.shape[:2]

    return {
        "success": True,
        "width": w,
        "height": h,
        "message": "Image received successfully"
    }