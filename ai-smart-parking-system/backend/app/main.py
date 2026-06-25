import logging
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import router
from app.core.config import get_settings
from app.core.database import Base, engine
from app.models import entities  # noqa: F401


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")


def create_app() -> FastAPI:
    settings = get_settings()
    Path(settings.media_root).mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    app = FastAPI(
        title="AI Parking Management System",
        version="1.0.0",
        description="FastAPI backend for YOLO + EasyOCR powered parking entry, exit, billing, reports, and dashboard APIs.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    app.mount("/media", StaticFiles(directory=settings.media_root), name="media")
    return app


app = create_app()
