from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./parking-local.db"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480
    admin_username: str = "admin"
    admin_password: str = "admin123"
    cors_origins: str = "http://localhost:5173"
    media_root: str = "media"
    yolo_model_path: str = "models/license_plate.pt"
    ocr_languages: str = "en"
    detection_confidence: float = 0.45
    ocr_confidence: float = 0.40
    duplicate_window_seconds: int = 120
    base_fee: int = 20
    included_minutes: int = 60
    additional_hourly_fee: int = 10
    total_capacity: int = 120
    entry_camera_rtsp_url: str | None = Field(default=None)
    exit_camera_rtsp_url: str | None = Field(default=None)

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def ocr_language_list(self) -> list[str]:
        return [lang.strip() for lang in self.ocr_languages.split(",") if lang.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
