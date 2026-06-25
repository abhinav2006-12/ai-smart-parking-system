INSERT INTO cameras (camera_name, camera_type, rtsp_url) VALUES
('Main Gate Entry', 'ENTRY', NULL),
('Main Gate Exit', 'EXIT', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO vehicles (plate_number) VALUES
('DL3CAB1234'),
('MH12CD5678'),
('KA03AA1111'),
('KL07XY9999')
ON CONFLICT (plate_number) DO NOTHING;

INSERT INTO parking_sessions (vehicle_id, entry_time, exit_time, duration_minutes, fee_amount, status, entry_camera_id, exit_camera_id)
SELECT v.id, NOW() - INTERVAL '3 hours', NULL, NULL, NULL, 'ACTIVE', 1, NULL
FROM vehicles v WHERE v.plate_number = 'DL3CAB1234'
ON CONFLICT DO NOTHING;

INSERT INTO parking_sessions (vehicle_id, entry_time, exit_time, duration_minutes, fee_amount, status, entry_camera_id, exit_camera_id)
SELECT v.id, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '40 minutes', 260, 60.00, 'UNPAID', 1, 2
FROM vehicles v WHERE v.plate_number = 'MH12CD5678'
ON CONFLICT DO NOTHING;

INSERT INTO parking_sessions (vehicle_id, entry_time, exit_time, duration_minutes, fee_amount, status, entry_camera_id, exit_camera_id)
SELECT v.id, NOW() - INTERVAL '1 day 2 hours', NOW() - INTERVAL '1 day', 120, 30.00, 'PAID', 1, 2
FROM vehicles v WHERE v.plate_number = 'KA03AA1111'
ON CONFLICT DO NOTHING;
