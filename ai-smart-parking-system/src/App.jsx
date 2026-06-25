import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const vehicles = [
  {
    plateNumber: 'KL07CX4581',
    vehicleType: 'Car',
    slot: 'A-14',
    confidence: 96,
    lane: 'ENTRY GATE 01',
    color: '#2dd4bf',
  },
  {
    plateNumber: 'MH12BT9022',
    vehicleType: 'Bike',
    slot: 'B-08',
    confidence: 93,
    lane: 'ENTRY GATE 01',
    color: '#60a5fa',
  },
  {
    plateNumber: 'KA03MN7744',
    vehicleType: 'Car',
    slot: 'A-21',
    confidence: 98,
    lane: 'ENTRY GATE 02',
    color: '#f59e0b',
  },
  {
    plateNumber: 'TN09QD1165',
    vehicleType: 'Bike',
    slot: 'B-03',
    confidence: 94,
    lane: 'ENTRY GATE 02',
    color: '#a78bfa',
  },
];

const timeFormat = new Intl.DateTimeFormat('en-IN', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: true,
});

function DetectionCard({ detection }) {
  return (
    <aside className="detection-card" aria-label="Latest detected vehicle">
      <div className="card-topline">
        <span className="live-dot" />
        <span>Vehicle detected</span>
      </div>
      <div className="plate-number">{detection.plateNumber}</div>
      <dl className="detection-fields">
        <div>
          <dt>Entry time</dt>
          <dd>{detection.entryTime}</dd>
        </div>
        <div>
          <dt>Allotted slot</dt>
          <dd>{detection.slot}</dd>
        </div>
        <div>
          <dt>Vehicle type</dt>
          <dd>{detection.vehicleType}</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{detection.confidence}%</dd>
        </div>
      </dl>
    </aside>
  );
}

function VehicleSilhouette({ type, color }) {
  if (type === 'Bike') {
    return (
      <div className="bike" style={{ '--vehicle-color': color }}>
        <span className="wheel wheel-left" />
        <span className="wheel wheel-right" />
        <span className="bike-frame" />
        <span className="bike-seat" />
      </div>
    );
  }

  return (
    <div className="car" style={{ '--vehicle-color': color }}>
      <span className="car-top" />
      <span className="car-body" />
      <span className="wheel car-wheel-left" />
      <span className="wheel car-wheel-right" />
      <span className="headlight" />
    </div>
  );
}

export default function App() {
  const videoRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [now, setNow] = useState(new Date());
  const [recentDetections, setRecentDetections] = useState([]);
  const [cameraState, setCameraState] = useState('starting');
  const [cameraError, setCameraError] = useState('');

  const activeVehicle = vehicles[activeIndex];
  const detection = useMemo(
    () => ({
      ...activeVehicle,
      entryTime: timeFormat.format(now),
      id: `${activeVehicle.plateNumber}-${now.getTime()}`,
    }),
    [activeVehicle, now],
  );

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    const detector = setInterval(() => {
      setActiveIndex((index) => (index + 1) % vehicles.length);
      setRecentDetections((items) => [
        {
          ...vehicles[(activeIndex + 1) % vehicles.length],
          entryTime: timeFormat.format(new Date()),
        },
        ...items,
      ].slice(0, 4));
    }, 5500);

    return () => {
      clearInterval(clock);
      clearInterval(detector);
    };
  }, [activeIndex]);

  useEffect(() => {
    let stream;

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported');
        setCameraError('Camera access is not supported in this browser.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraState('live');
        setCameraError('');
      } catch (error) {
        setCameraState('blocked');
        setCameraError('Allow camera permission to show live detection.');
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <main className="live-page">
      <section className="camera-shell">
        <header className="camera-header">
          <div>
            <p className="eyebrow">AI parking entry camera</p>
            <h1>Live Vehicle Detection</h1>
          </div>
          <div className="camera-status">
            <span className="record-dot" />
            LIVE
          </div>
        </header>

        <div className="camera-frame">
          <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
          {cameraState !== 'live' && (
            <div className="camera-permission">
              <strong>{cameraState === 'starting' ? 'Starting camera...' : 'Camera not active'}</strong>
              <span>{cameraError || 'Waiting for browser permission.'}</span>
            </div>
          )}
          <div className="camera-noise" />
          <div className="scan-line" />
          <div className="road">
            <span className="lane-mark lane-1" />
            <span className="lane-mark lane-2" />
            <span className="lane-mark lane-3" />
            <span className="gate-line" />
          </div>

          <div className="timestamp">{timeFormat.format(now)}</div>
          <div className="camera-label">{activeVehicle.lane}</div>

          <div className="tracking-box">
            <span className="corner top-left" />
            <span className="corner top-right" />
            <span className="corner bottom-left" />
            <span className="corner bottom-right" />
            <span className="tracking-label">YOLO PLATE LOCKED</span>
            <VehicleSilhouette type={activeVehicle.vehicleType} color={activeVehicle.color} />
          </div>

          <DetectionCard detection={detection} />
        </div>
      </section>

      <section className="side-panel">
        <div className="system-card">
          <span className="system-value">{activeVehicle.confidence}%</span>
          <span className="system-label">OCR confidence</span>
        </div>
        <div className="system-card">
          <span className="system-value">{activeVehicle.slot}</span>
          <span className="system-label">Current allocation</span>
        </div>
        <div className="recent-list">
          <h2>Recent detections</h2>
          {(recentDetections.length ? recentDetections : [detection]).map((item, index) => (
            <article key={`${item.plateNumber}-${index}`} className="recent-item">
              <span className="recent-plate">{item.plateNumber}</span>
              <span>{item.vehicleType}</span>
              <strong>{item.slot}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
