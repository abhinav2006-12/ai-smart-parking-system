import { useState, useEffect } from 'react';
import { 
  Tools, 
  CheckOut, 
  Car, 
  EV, 
  Disabled, 
  Revenue, 
  Clock, 
  Logs, 
  Dashboard, 
  Camera, 
  Logo, 
  Search, 
  TrendUp, 
  TrendDown 
} from './Icons';

export default function AdminDashboard({ 
  parkings, 
  slots, 
  onSimulateCheckIn, 
  onSimulateCheckOut,
  revenueToday,
  revenueYesterday
}) {
  const [hoveredSlot, setHoveredSlot] = useState(null);
  const [activeCam, setActiveCam] = useState(1);
  const [cctvLogs, setCctvLogs] = useState([]);
  
  // Active counts
  const totalVehiclesCount = parkings.length;
  const activeParkingCount = parkings.filter(p => p.status === 'active').length;
  const leftParkingsCount = parkings.filter(p => p.status === 'completed' && isToday(p.exitTime)).length;
  const emptySlotsCount = slots.filter(s => !s.isOccupied).length;

  function isToday(dateStr) {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  // Generate random CCTV messages to simulate AI activity
  useEffect(() => {
    const events = [
      "AI CAM 1: Detected license plate OCR confidence 98.4%",
      "AI CAM 2: Bounding box mapped to EV slot B5",
      "AI OCR: Vehicle classification - SUV (Gray)",
      "SYSTEM: Smart slot allocation optimized for Standard A23",
      "AI CAM 1: Speed detection verified - 12 km/h",
      "AI CAM 2: Scanning exit gate... ready for payment",
      "SYSTEM: Dynamic hourly rate updated",
      "AI CAM 1: Vehicle classification - EV Sedan (Black)"
    ];
    
    // Seed initial logs
    setCctvLogs([
      "AI CAM 1: Initialized neural network scanner",
      "SYSTEM: Parking space mapping calibrated (60 slots)",
      "AI CAM 2: Gate sensor active"
    ]);

    const interval = setInterval(() => {
      const randomMsg = events[Math.floor(Math.random() * events.length)];
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCctvLogs(prev => [`[${timeString}] ${randomMsg}`, ...prev.slice(0, 7)]);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Compute stats for SVG Charts
  // 1. Hourly occupancy curve (mock data based on active parking)
  const occupancyHours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  // Scaled values for SVG height (0 to 100)
  const baseOccupancies = [15, 30, 48, 55, 62, 58, 40, 20];
  // Adjust peak slightly dynamically based on active count
  const occupancies = baseOccupancies.map((val, idx) => {
    if (idx >= 3 && idx <= 5) {
      return Math.min(100, val + activeParkingCount * 2);
    }
    return val;
  });

  // SVG Area path points generator
  const areaPoints = occupancies.map((val, idx) => {
    const x = (idx / (occupancies.length - 1)) * 500 + 40;
    const y = 200 - (val / 100) * 160;
    return { x, y, value: val };
  });

  const pathD = areaPoints.length > 0 
    ? `M ${areaPoints[0].x} 200 ` + areaPoints.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L ${areaPoints[areaPoints.length - 1].x} 200 Z` 
    : '';

  const lineD = areaPoints.length > 0
    ? `M ${areaPoints[0].x} ${areaPoints[0].y} ` + areaPoints.map(p => `L ${p.x} ${p.y}`).join(' ')
    : '';

  // 2. Revenue by slot type
  const typeRevenue = parkings.reduce((acc, p) => {
    if (p.status === 'completed' && p.fee) {
      acc[p.slotType] = (acc[p.slotType] || 0) + p.fee;
    }
    return acc;
  }, { standard: 450, ev: 780, disabled: 120 }); // Seeded rupees values for visual layout

  const maxRevenue = Math.max(...Object.values(typeRevenue), 1);
  const barHeights = {
    standard: (typeRevenue.standard / maxRevenue) * 140,
    ev: (typeRevenue.ev / maxRevenue) * 140,
    disabled: (typeRevenue.disabled / maxRevenue) * 140
  };

  return (
    <div>
      {/* Simulation Banner Controls */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <Tools size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 800, marginBottom: '4px', fontFamily: 'var(--font-title)' }}>Smart Parking Simulator Console</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                Simulate real-time camera events, OCR plate reading, and automatic vehicle check-in/out.
              </p>
            </div>
          </div>
          <div className="sim-controls">
            <button className="btn btn-sm btn-primary" onClick={onSimulateCheckIn} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Car size={14} />
              <span>Vehicle Entry (Scan & Park)</span>
            </button>
            <button 
              className="btn btn-sm" 
              onClick={onSimulateCheckOut}
              disabled={activeParkingCount === 0}
              style={{ 
                borderColor: 'var(--warning)', 
                color: '#fbbf24', 
                background: 'rgba(245, 158, 11, 0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckOut size={14} />
              <span>Vehicle Exit (Checkout & Pay)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-row">
        {/* Metric 1: Active Parking */}
        <div className="card metric-card purple">
          <div className="metric-header">
            <span>Active Parking</span>
            <div className="metric-icon icon-purple">
              <Car size={16} />
            </div>
          </div>
          <div className="metric-value">{activeParkingCount}</div>
          <div className="metric-footer">
            <span className="trend-up" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--success)', borderRadius: '50%' }}></span>
              <span>Live</span>
            </span>
            <span style={{ color: 'var(--text-muted)' }}>Occupying space</span>
          </div>
        </div>

        {/* Metric 2: Empty Slots */}
        <div className="card metric-card cyan">
          <div className="metric-header">
            <span>Empty Slots</span>
            <div className="metric-icon icon-cyan">
              <Logo size={16} />
            </div>
          </div>
          <div className="metric-value">{emptySlotsCount}</div>
          <div className="metric-footer">
            <span className={emptySlotsCount > 10 ? 'trend-up' : 'trend-down'}>
              {((emptySlotsCount / slots.length) * 100).toFixed(0)}% available
            </span>
          </div>
        </div>

        {/* Metric 3: Revenue Today */}
        <div className="card metric-card green">
          <div className="metric-header">
            <span>Revenue Today</span>
            <div className="metric-icon icon-green">
              <Revenue size={16} />
            </div>
          </div>
          <div className="metric-value">₹{revenueToday.toFixed(0)}</div>
          <div className="metric-footer">
            {revenueToday >= revenueYesterday ? (
              <span className="trend-up" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <TrendUp size={12} />
                <span>+{revenueYesterday > 0 ? ((revenueToday - revenueYesterday) / revenueYesterday * 100).toFixed(0) : 100}%</span>
              </span>
            ) : (
              <span className="trend-down" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <TrendDown size={12} />
                <span>-{((revenueYesterday - revenueToday) / revenueYesterday * 100).toFixed(0)}%</span>
              </span>
            )}
            <span style={{ color: 'var(--text-muted)' }}>vs yesterday</span>
          </div>
        </div>

        {/* Metric 4: Revenue Yesterday */}
        <div className="card metric-card yellow">
          <div className="metric-header">
            <span>Revenue Yesterday</span>
            <div className="metric-icon icon-yellow">
              <Clock size={16} />
            </div>
          </div>
          <div className="metric-value">₹{revenueYesterday.toFixed(0)}</div>
          <div className="metric-footer">
            <span className="trend-neutral">Stable</span>
            <span style={{ color: 'var(--text-muted)' }}>Calculated daily</span>
          </div>
        </div>

        {/* Metric 5: Total Logs */}
        <div className="card metric-card red">
          <div className="metric-header">
            <span>Total Vehicles Today</span>
            <div className="metric-icon icon-red">
              <Logs size={16} />
            </div>
          </div>
          <div className="metric-value">{totalVehiclesCount}</div>
          <div className="metric-footer">
            <span className="trend-up">+{leftParkingsCount} checked out</span>
          </div>
        </div>
      </div>

      {/* Main Dashboard Panel */}
      <div className="dashboard-main-content">
        {/* Left Side: Graphs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Chart Card */}
          <div className="card">
            <div className="section-title">
              <Dashboard size={18} style={{ color: 'var(--primary)' }} />
              <span>Analytics: Occupancy Trend & Revenue</span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px' }}>
              {/* Occupancy SVG Area Chart */}
              <div>
                <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'left' }}>
                  24h Occupancy Curve (% Spaces filled)
                </h5>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '10px', boxShadow: 'var(--clay-shadow-inset)' }}>
                  <svg className="svg-chart" viewBox="0 0 560 220">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Y Axis Gridlines & Labels */}
                    {[0, 25, 50, 75, 100].map(val => {
                      const y = 200 - (val / 100) * 160;
                      return (
                        <g key={val}>
                          <line x1="40" y1={y} x2="540" y2={y} className="chart-grid-line" />
                          <text x="30" y={y + 4} textAnchor="end" className="chart-axis-text">{val}%</text>
                        </g>
                      );
                    })}
                    
                    {/* X Axis Labels */}
                    {occupancyHours.map((hour, idx) => {
                      const x = (idx / (occupancyHours.length - 1)) * 500 + 40;
                      return (
                        <text key={hour} x={x} y="215" textAnchor="middle" className="chart-axis-text">{hour}</text>
                      );
                    })}

                    {/* Area path */}
                    <path d={pathD} fill="url(#areaGrad)" />
                    
                    {/* Line path */}
                    <path d={lineD} fill="none" stroke="var(--primary)" strokeWidth="3" />
                    
                    {/* Point circles */}
                    {areaPoints.map((pt, idx) => (
                      <g key={idx}>
                        <circle 
                          cx={pt.x} 
                          cy={pt.y} 
                          r="5" 
                          fill="#fff" 
                          stroke="var(--primary)" 
                          strokeWidth="2.5"
                          style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                          onMouseEnter={(e) => {
                            e.target.setAttribute('r', '8');
                            setHoveredSlot({
                              x: pt.x,
                              y: pt.y,
                              title: `Time: ${occupancyHours[idx]}`,
                              desc: `Occupancy: ${pt.value.toFixed(0)}%`
                            });
                          }}
                          onMouseLeave={(e) => {
                            e.target.setAttribute('r', '5');
                            setHoveredSlot(null);
                          }}
                        />
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Revenue Distribution Chart */}
              <div>
                <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'left' }}>
                  Revenue distribution by slot type (₹)
                </h5>
                <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '10px', height: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: 'var(--clay-shadow-inset)' }}>
                  <div style={{ display: 'flex', height: '160px', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: '10px' }}>
                    {/* Standard bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                        ₹{typeRevenue.standard.toFixed(0)}
                      </span>
                      <div style={{ 
                        height: `${barHeights.standard}px`, 
                        width: '32px', 
                        background: 'linear-gradient(to top, #7c3aed, var(--primary))',
                        borderRadius: '4px 4px 0 0',
                        boxShadow: '0 0 10px rgba(124, 58, 237, 0.2)'
                      }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px' }}>Standard</span>
                    </div>

                    {/* EV Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                        ₹{typeRevenue.ev.toFixed(0)}
                      </span>
                      <div style={{ 
                        height: `${barHeights.ev}px`, 
                        width: '32px', 
                        background: 'linear-gradient(to top, #0891b2, var(--cyan))',
                        borderRadius: '4px 4px 0 0',
                        boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)'
                      }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px' }}>EV Bay</span>
                    </div>

                    {/* Disabled Bar */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 'bold', marginBottom: '4px' }}>
                        ₹{typeRevenue.disabled.toFixed(0)}
                      </span>
                      <div style={{ 
                        height: `${barHeights.disabled}px`, 
                        width: '32px', 
                        background: 'linear-gradient(to top, #2563eb, #3b82f6)',
                        borderRadius: '4px 4px 0 0',
                        boxShadow: '0 0 10px rgba(59, 130, 246, 0.2)'
                      }} />
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '8px' }}>Disabled</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                    Aggregate live & seeded logs
                  </div>
                </div>
              </div>
            </div>

            {/* Custom chart tooltip rendering */}
            {hoveredSlot && hoveredSlot.x && (
              <div className="chart-tooltip" style={{ left: `${hoveredSlot.x + 20}px`, top: `${hoveredSlot.y - 10}px` }}>
                <strong style={{ display: 'block' }}>{hoveredSlot.title}</strong>
                <span>{hoveredSlot.desc}</span>
              </div>
            )}
          </div>

          {/* AI CCTV camera monitoring panel */}
          <div className="card">
            <div className="section-title">
              <Camera size={18} style={{ color: 'var(--primary)' }} />
              <span>CCTV AI Scanner Feed</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setActiveCam(1)} 
                  className={`btn btn-sm ${activeCam === 1 ? 'btn-active' : ''}`}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  CAM 01 (Entry)
                </button>
                <button 
                  onClick={() => setActiveCam(2)} 
                  className={`btn btn-sm ${activeCam === 2 ? 'btn-active' : ''}`}
                  style={{ padding: '2px 8px', fontSize: '10px' }}
                >
                  CAM 02 (EV Bay)
                </button>
              </div>
            </div>

            <div className="ai-camera-panel">
              {/* Left Column: Feed View */}
              <div className="camera-feed">
                <div className="camera-grid-lines"></div>
                <div className="scan-line"></div>
                
                <div className="camera-overlay">
                  <span className="camera-tag">
                    <span className="camera-rec-dot"></span>
                    CAM_0{activeCam}_LIVE
                  </span>
                  <span className="camera-tag" style={{ borderLeftColor: 'var(--cyan)', color: 'var(--cyan)' }}>
                    FPS: 30.0 // AI_ON
                  </span>
                </div>

                {activeCam === 1 ? (
                  /* Entry Camera Simulation Graphics */
                  <div className="camera-placeholder-graphics" style={{ background: '#0e0e16' }}>
                    <div style={{ position: 'relative', width: '220px', height: '120px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="ai-det-box" style={{ width: '120px', height: '60px', top: '25px', left: '50px' }}>
                        <span className="ai-det-label">PLATE: OCR_SCANNING_CONF_99%</span>
                      </div>
                      
                      {/* Stylized Vector Car representation instead of emoji */}
                      <svg width="64" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5" style={{ opacity: 0.85 }}>
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" />
                        <path d="M9 17h6" />
                        <circle cx="17" cy="17" r="2" />
                      </svg>
                      
                      <span style={{ fontSize: '10px', color: 'var(--cyan)', fontFamily: 'monospace', letterSpacing: '1px', marginTop: '4px' }}>
                        TRACKING_ID: #IND_9041
                      </span>
                    </div>
                  </div>
                ) : (
                  /* EV Bay Camera Simulation Graphics */
                  <div className="camera-placeholder-graphics" style={{ background: '#0e0e16' }}>
                    <div style={{ position: 'relative', width: '240px', height: '120px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center', position: 'relative' }}>
                        <div className="ai-det-box" style={{ width: '80px', height: '80px', top: '10px', left: '10px', borderColor: 'var(--success)' }}>
                          <span className="ai-det-label" style={{ background: 'var(--success)' }}>SLOT B1: FREE</span>
                        </div>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ opacity: 0.2 }}>
                          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                        </svg>
                        <div style={{ fontSize: '9px', color: 'var(--success-hover)', fontFamily: 'monospace', marginTop: '4px' }}>EV B1</div>
                      </div>

                      <div style={{ textAlign: 'center', position: 'relative' }}>
                        <div className="ai-det-box" style={{ width: '80px', height: '80px', top: '10px', left: '10px', borderColor: 'var(--danger)' }}>
                          <span className="ai-det-label" style={{ background: 'var(--danger)' }}>SLOT B2: CHARGE</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5">
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                          </svg>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--cyan)" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4l-3 4h4v5l4-6h-4z" />
                          </svg>
                        </div>
                        <div style={{ fontSize: '9px', color: '#f87171', fontFamily: 'monospace', marginTop: '4px' }}>EV B2</div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                  {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                </div>
              </div>

              {/* Right Column: AI Terminal Logs */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h5 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', textAlign: 'left', fontWeight: 700 }}>
                  🧠 AI OCR Inference Stream
                </h5>
                <div style={{
                  flex: 1,
                  background: '#1a1028',
                  borderRadius: '12px',
                  padding: '12px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  textAlign: 'left',
                  color: '#a5f3fc',
                  overflowY: 'auto',
                  maxHeight: '190px',
                  boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.4)'
                }}>
                  {cctvLogs.map((log, index) => (
                    <div key={index} style={{ marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '4px', opacity: index === 0 ? 1 : 1 - (index * 0.12) }}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Slot Map */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: '90px' }}>
          <div className="section-title">
            <Logo size={18} style={{ color: 'var(--primary)' }} />
            <span>Parking Lot Space Map</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-secondary)' }}>
              ({activeParkingCount}/60 Occupied)
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', marginBottom: '14px', fontSize: '11px', background: 'var(--bg-secondary)', padding: '10px 8px', borderRadius: '12px', boxShadow: 'var(--clay-shadow-inset)', gap: '8px' }}>
            <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--success)', borderRadius: '50%' }}></span> Empty
            </span>
            <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--danger)', borderRadius: '50%' }}></span> Occupied
            </span>
            <span style={{ color: 'var(--cyan-hover)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <EV size={10} /> EV Bay
            </span>
            <span style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Disabled size={10} /> Disabled
            </span>
          </div>

          <div className="slot-map">
            {slots.map(slot => {
              const activeParking = parkings.find(p => p.slotId === slot.id && p.status === 'active');
              const isOccupied = slot.isOccupied;
              
              let slotClass = `slot-item ${isOccupied ? 'occupied' : 'empty'}`;
              
              return (
                <div 
                  key={slot.id} 
                  className={slotClass}
                  style={{
                    borderBottomColor: slot.type === 'ev' ? 'var(--cyan)' : slot.type === 'disabled' ? '#2563eb' : ''
                  }}
                  onMouseEnter={() => setHoveredSlot({
                    id: slot.id,
                    type: slot.type,
                    occupied: isOccupied,
                    vehicle: activeParking ? activeParking.plateNumber : null,
                    time: activeParking ? new Date(activeParking.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
                  })}
                  onMouseLeave={() => setHoveredSlot(null)}
                >
                  <span>{slot.id}</span>
                  
                  {slot.type === 'ev' && <span className="slot-badge ev"><EV size={8} /></span>}
                  {slot.type === 'disabled' && <span className="slot-badge disabled"><Disabled size={8} /></span>}
                  
                  {isOccupied && activeParking && (
                    <span className="slot-plate">{activeParking.plateNumber}</span>
                  )}
                  
                  {isOccupied && (
                    <button 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (confirm(`Check-out vehicle ${activeParking.plateNumber} from slot ${slot.id}?`)) {
                          onSimulateCheckOut(activeParking.plateNumber);
                        }
                      }}
                      title="Click to quickly checkout"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick slot inspector footer */}
          <div style={{
            marginTop: '14px',
            padding: '14px',
            background: 'var(--bg-secondary)',
            borderRadius: '14px',
            fontSize: '12px',
            textAlign: 'left',
            minHeight: '62px',
            boxShadow: 'var(--clay-shadow-inset)'
          }}>
            {hoveredSlot && hoveredSlot.id ? (
              <div>
                <div style={{ fontWeight: 'bold', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Space {hoveredSlot.id} [{hoveredSlot.type.toUpperCase()}]</span>
                  <span style={{ color: hoveredSlot.occupied ? '#f87171' : 'var(--success-hover)' }}>
                    {hoveredSlot.occupied ? 'Occupied' : 'Available'}
                  </span>
                </div>
                {hoveredSlot.occupied && hoveredSlot.vehicle && (
                  <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '12px' }}>
                    Plate: <strong style={{ color: 'var(--text-primary)' }}>{hoveredSlot.vehicle}</strong> | In since: {hoveredSlot.time}
                  </div>
                )}
                {!hoveredSlot.occupied && (
                  <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                    Rate: {hoveredSlot.type === 'ev' ? '₹60.00/hr (Inc. Charging)' : hoveredSlot.type === 'disabled' ? '₹20.00/hr' : '₹40.00/hr'}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'center', gap: '6px' }}>
                <Search size={12} />
                <span>Hover over a slot for details or click occupied to release</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
