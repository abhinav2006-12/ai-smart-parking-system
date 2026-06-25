CREATE TYPE camera_type AS ENUM ('ENTRY', 'EXIT');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'COMPLETED', 'PAID', 'UNPAID');

CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    plate_number VARCHAR(32) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cameras (
    id SERIAL PRIMARY KEY,
    camera_name VARCHAR(120) NOT NULL,
    camera_type camera_type NOT NULL,
    rtsp_url TEXT
);

CREATE TABLE IF NOT EXISTS parking_sessions (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    fee_amount NUMERIC(10, 2),
    status session_status NOT NULL DEFAULT 'ACTIVE',
    entry_image_path TEXT,
    exit_image_path TEXT,
    entry_camera_id INTEGER REFERENCES cameras(id),
    exit_camera_id INTEGER REFERENCES cameras(id)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_entry_time ON parking_sessions(entry_time DESC);
