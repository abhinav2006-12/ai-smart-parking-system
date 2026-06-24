import { useState, useEffect } from 'react';
import { 
  CheckIn, 
  CheckOut, 
  Car, 
  EV, 
  Disabled, 
  Camera, 
  Ticket, 
  Check, 
  Warning, 
  Clock 
} from './Icons';

// List of mock vehicles for the Indian AI scanning simulation
const MOCK_SCANNED_CARS = [
  { plate: 'DL-01-CA-1234', style: 'Sedan', color: 'Midnight Silver' },
  { plate: 'MH-12-DE-7777', style: 'SUV', color: 'Sunset Gold' },
  { plate: 'KL-07-XY-9999', style: 'Hatchback', color: 'Cyber Green' },
  { plate: 'KA-03-AB-1111', style: 'SUV', color: 'Solid White' },
  { plate: 'HR-26-BC-7890', style: 'Luxury Sedan', color: 'Carbon Black' },
  { plate: 'UP-16-AA-5678', style: 'Compact SUV', color: 'Cherry Red' }
];

export default function GuestPortal({ 
  parkings, 
  slots, 
  onCheckIn, 
  onCheckOutSuccess 
}) {
  const [activeTab, setActiveTab] = useState('checkin');
  
  // Check-In Form State
  const [plateNumber, setPlateNumber] = useState('');
  const [slotType, setSlotType] = useState('standard');
  const [ticketPrintout, setTicketPrintout] = useState(null);
  
  // AI Scan Simulation State
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCar, setScannedCar] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [scanSuccess, setScanSuccess] = useState(false);

  // Check-Out Form State
  const [checkoutPlate, setCheckoutPlate] = useState('');
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  
  // Time multiplier simulator for testing checkout
  const [simulatedDurationHours, setSimulatedDurationHours] = useState(1);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // AI OCR decryption text effect
  useEffect(() => {
    if (!isScanning) return;
    
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-';
    let iterations = 0;
    const targetPlate = scannedCar.plate;

    const interval = setInterval(() => {
      setOcrText(prev => {
        return targetPlate.split('')
          .map((char, index) => {
            if (index < iterations) return targetPlate[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('');
      });
      
      iterations += 0.5;
      if (iterations >= targetPlate.length + 1) {
        clearInterval(interval);
        setOcrText(targetPlate);
        setPlateNumber(targetPlate);
        setIsScanning(false);
        setScanSuccess(true);
        // Clear scan success flash after 1s
        setTimeout(() => setScanSuccess(false), 1200);
      }
    }, 80);

    return () => clearInterval(interval);
  }, [isScanning, scannedCar]);

  // Handle AI Scan trigger
  const handleAIScan = () => {
    if (isScanning) return;
    setScanSuccess(false);
    const randomCar = MOCK_SCANNED_CARS[Math.floor(Math.random() * MOCK_SCANNED_CARS.length)];
    setScannedCar(randomCar);
    setIsScanning(true);
    setOcrText('--------------');
  };

  // Submit Check-In
  const handleCheckInSubmit = (e) => {
    e.preventDefault();
    if (!plateNumber.trim()) {
      alert('Please enter a license plate number.');
      return;
    }

    const result = onCheckIn(plateNumber.toUpperCase().replace(/\s+/g, ''), slotType);
    if (result.success) {
      setTicketPrintout({
        plate: result.parking.plateNumber,
        slotId: result.parking.slotId,
        entryTime: result.parking.entryTime,
        slotType: result.parking.slotType
      });
      // Reset form fields
      setPlateNumber('');
      setScannedCar(null);
      setOcrText('');
    } else {
      alert(result.error);
    }
  };

  // Fetch Session for checkout
  const handleSearchCheckout = (e) => {
    e.preventDefault();
    setCheckoutError('');
    setCheckoutSession(null);

    if (!checkoutPlate.trim()) {
      setCheckoutError('Please enter your license plate.');
      return;
    }

    const activeSession = parkings.find(
      p => p.plateNumber.toUpperCase() === checkoutPlate.trim().toUpperCase() && p.status === 'active'
    );

    if (activeSession) {
      setCheckoutSession(activeSession);
      // default simulated hours is elapsed hours rounded up
      const elapsedMs = new Date() - new Date(activeSession.entryTime);
      const elapsedHours = Math.ceil(elapsedMs / (1000 * 60 * 60)) || 1;
      setSimulatedDurationHours(elapsedHours);
    } else {
      setCheckoutError('No active parking record found for this plate number.');
    }
  };

  // Live calculation of fees based on simulated hours
  const calculateFees = () => {
    if (!checkoutSession) return 0;
    const rate = checkoutSession.slotType === 'ev' ? 60 : checkoutSession.slotType === 'disabled' ? 20 : 40;
    return simulatedDurationHours * rate;
  };

  // Perform Simulated Payment checkout
  const handlePaymentComplete = () => {
    const finalFee = calculateFees();
    
    // Modify the entryTime backwards in memory to match the simulated hours
    // so that the saved log duration and yesterday/today records reflect the correct numbers
    const entryDate = new Date();
    entryDate.setHours(entryDate.getHours() - simulatedDurationHours);
    checkoutSession.entryTime = entryDate.toISOString();

    const result = onCheckOutSuccess(checkoutSession.plateNumber, finalFee);
    if (result.success) {
      setPaymentSuccess(true);
      setTimeout(() => {
        setPaymentSuccess(false);
        setPaymentModalOpen(false);
        setCheckoutSession(null);
        setCheckoutPlate('');
      }, 2000);
    } else {
      alert(result.error);
    }
  };

  // Custom QR Code SVG generator (Indian BHIM / UPI simulation look)
  const renderQRCode = (plate, amount) => {
    const blocks = [];
    const size = 21;
    
    let seed = plate.charCodeAt(0) || 42;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isCorner = 
          (r < 7 && c < 7) || 
          (r < 7 && c >= size - 7) || 
          (r >= size - 7 && c < 7);
          
        if (isCorner) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6 || 
                           (r === 0 && c >= size - 7) || (r === 6 && c >= size - 7) || 
                           (c === size - 7 && r < 7) || (c === size - 1 && r < 7) ||
                           (r === size - 7 && c < 7) || (r === size - 1 && c < 7) ||
                           (c === 0 && r >= size - 7) || (c === 6 && r >= size - 7);
          
          const isInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
                          (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
                          (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4);
                          
          if (isBorder || isInner) {
            blocks.push(<rect key={`${r}-${c}`} x={c * 8} y={r * 8} width="8" height="8" fill="#0f172a" />);
          }
        } else {
          if (random() > 0.45) {
            blocks.push(<rect key={`${r}-${c}`} x={c * 8} y={r * 8} width="8" height="8" fill="#0f172a" />);
          }
        }
      }
    }

    return (
      <svg viewBox="0 0 168 168" className="qr-svg">
        <rect width="168" height="168" fill="#ffffff" rx="4" />
        <g transform="translate(0, 0)">
          {blocks}
        </g>
        <rect x="68" y="68" width="32" height="32" rx="4" fill="var(--primary)" />
        <text x="84" y="87" fill="#ffffff" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">UPI</text>
      </svg>
    );
  };

  return (
    <div className="guest-container">
      {/* Navigation tabs */}
      <div className="tab-nav">
        <div 
          className={`tab-item ${activeTab === 'checkin' ? 'active' : ''}`}
          onClick={() => { setActiveTab('checkin'); setTicketPrintout(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <CheckIn size={18} />
          <span>Check-In Vehicle</span>
        </div>
        <div 
          className={`tab-item ${activeTab === 'checkout' ? 'active' : ''}`}
          onClick={() => { setActiveTab('checkout'); setCheckoutError(''); setCheckoutSession(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <CheckOut size={18} />
          <span>Check-Out & Pay</span>
        </div>
      </div>

      {/* Guest View Check-In */}
      {activeTab === 'checkin' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
          
          {/* Checkin form card */}
          <div className="card">
            <div className="section-title">
              <Car size={18} style={{ color: 'var(--primary)' }} />
              <span>Guest Check-In Ticket</span>
            </div>
            
            <form onSubmit={handleCheckInSubmit}>
              <div className="form-group">
                <label className="form-label">Vehicle License Plate Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. DL-01-CA-1234"
                  style={{ textTransform: 'uppercase', fontSize: '18px', fontWeight: '700', fontFamily: 'var(--font-title)' }}
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  disabled={isScanning}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Space Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <button
                    type="button"
                    className={`btn ${slotType === 'standard' ? 'btn-active' : ''}`}
                    onClick={() => setSlotType('standard')}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '12px 6px', 
                      fontSize: '12px' 
                    }}
                  >
                    <Car size={16} />
                    <span>Standard<br/>₹40/hr</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${slotType === 'ev' ? 'btn-active' : ''}`}
                    onClick={() => setSlotType('ev')}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '12px 6px', 
                      fontSize: '12px', 
                      borderColor: slotType === 'ev' ? 'var(--cyan)' : '' 
                    }}
                  >
                    <EV size={16} />
                    <span>EV Bay<br/>₹60/hr</span>
                  </button>
                  <button
                    type="button"
                    className={`btn ${slotType === 'disabled' ? 'btn-active' : ''}`}
                    onClick={() => setSlotType('disabled')}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '4px',
                      padding: '12px 6px', 
                      fontSize: '12px', 
                      borderColor: slotType === 'disabled' ? '#2563eb' : '' 
                    }}
                  >
                    <Disabled size={16} />
                    <span>Disabled<br/>₹20/hr</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', marginTop: '12px', fontWeight: 'bold' }}
                disabled={isScanning}
              >
                Confirm Check-In & Allocate Slot
              </button>
            </form>
          </div>

          {/* Right column: AI plate recognition simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ padding: '20px' }}>
              <div className="section-title">
                <Camera size={18} style={{ color: 'var(--cyan)' }} />
                <span>AI Camera OCR Scanner Simulator</span>
              </div>
              
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
                Simulate gate cameras running automated License Plate recognition on entry.
              </p>

              <div className="scanner-simulation-container">
                <div className="scanner-viewfinder">
                  {scanSuccess && <div className="scanner-success-pulse" />}
                  {isScanning && <div className="scan-line" />}
                  
                  {scannedCar ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <svg width="64" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1.5">
                        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2" />
                        <circle cx="7" cy="17" r="2" />
                        <path d="M9 17h6" />
                        <circle cx="17" cy="17" r="2" />
                      </svg>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {scannedCar.color} {scannedCar.style}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
                      <Camera size={28} />
                      <span>Camera Offline<br/>Click trigger below to start OCR</span>
                    </div>
                  )}

                  {scannedCar && (
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.7)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      color: 'var(--cyan)'
                    }}>
                      {isScanning ? 'AI PROCESSING...' : 'CLASSIFICATION: SUCCESS'}
                    </div>
                  )}
                </div>

                <div className="ocr-result-display">
                  {ocrText ? ocrText : 'OCR READY'}
                </div>

                <button
                  type="button"
                  className="btn"
                  onClick={handleAIScan}
                  disabled={isScanning}
                  style={{ width: '100%', borderColor: 'var(--cyan)', color: 'var(--cyan-hover)', background: 'rgba(6, 182, 212, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Camera size={14} />
                  <span>Trigger AI Plate Scanner</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest View Check-Out */}
      {activeTab === 'checkout' && (
        <div style={{ maxWidth: '560px', margin: '0 auto', width: '100%' }}>
          <div className="card">
            <div className="section-title">
              <CheckOut size={18} style={{ color: 'var(--primary)' }} />
              <span>Check-Out & Parking Bill</span>
            </div>

            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
              Enter your plate number to compute elapsed duration and pay your parking fees.
            </p>

            <form onSubmit={handleSearchCheckout} style={{ marginBottom: '20px' }}>
              <div className="form-group">
                <label className="form-label">Search active vehicles</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    className="form-control"
                    value={checkoutPlate}
                    onChange={(e) => setCheckoutPlate(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Select Active Vehicle --</option>
                    {parkings.filter(p => p.status === 'active').map(p => (
                      <option key={p.id} value={p.plateNumber}>
                        {p.plateNumber} (Slot {p.slotId})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 16px' }}>
                    Find
                  </button>
                </div>
              </div>
            </form>

            {checkoutError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                <Warning size={16} />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* If ticket session is found, render the invoice details */}
            {checkoutSession && (
              <div style={{ animation: 'fade-in 0.3s ease-out' }}>
                <div className="summary-list">
                  <div className="summary-item">
                    <span>License Plate</span>
                    <strong>{checkoutSession.plateNumber}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Allocated Space</span>
                    <strong>{checkoutSession.slotId} ({checkoutSession.slotType.toUpperCase()})</strong>
                  </div>
                  <div className="summary-item">
                    <span>Checked In</span>
                    <span>{new Date(checkoutSession.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="summary-item">
                    <span>Rate / hour</span>
                    <span>
                      {checkoutSession.slotType === 'ev' ? '₹60.00' : checkoutSession.slotType === 'disabled' ? '₹20.00' : '₹40.00'}
                    </span>
                  </div>
                </div>

                {/* Developer testing: Simulated time controls */}
                <div style={{
                background: 'var(--bg-secondary)',
              padding: '16px 20px',
              borderRadius: '14px',
              marginBottom: '20px',
              textAlign: 'left',
              boxShadow: 'var(--clay-shadow-inset)'
                }}>
                  <label className="form-label" style={{ color: '#fbbf24', display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={14} />
                      <span>Speed-up duration for testing:</span>
                    </span>
                    <strong>{simulatedDurationHours} Hour{simulatedDurationHours > 1 ? 's' : ''}</strong>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="24"
                    value={simulatedDurationHours}
                    onChange={(e) => setSimulatedDurationHours(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--warning)', cursor: 'pointer', marginTop: '6px' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <span>1 Hour (₹)</span>
                    <span>12 Hours (₹)</span>
                    <span>24 Hours (₹)</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--success-bg)',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  marginBottom: '20px',
                  boxShadow: 'var(--clay-shadow-sm)'
                }}>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>TOTAL AMOUNT DUE:</span>
                  <span style={{ fontSize: '26px', fontWeight: '900', color: 'var(--success)', fontFamily: 'var(--font-title)' }}>
                    ₹{calculateFees().toFixed(0)}
                  </span>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '14px', fontWeight: 'bold' }}
                  onClick={() => setPaymentModalOpen(true)}
                >
                  Proceed to QR Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticket printout preview modal (Guest Check In Successful) */}
      {ticketPrintout && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '380px' }}>
            <Ticket size={48} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
            <h3 className="modal-title">Smart Parking Ticket</h3>
            <p className="modal-subtitle">Allocated successfully! Please park in your designated space.</p>
            
            <div style={{
              background: 'var(--bg-secondary)',
              border: '2px dashed rgba(124,92,191,0.2)',
              borderRadius: '16px',
              padding: '16px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>PLATE:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{ticketPrintout.plate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>ALLOCATED SPACE:</span>
                <strong style={{ color: 'var(--cyan-hover)' }}>{ticketPrintout.slotId}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>SPACE TYPE:</span>
                <span>{ticketPrintout.slotType.toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span>ENTRY TIME:</span>
                <span>{new Date(ticketPrintout.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              {/* Simulated barcode */}
              <div style={{
                height: '40px',
                borderTop: '1px solid rgba(124,92,191,0.2)',
                borderBottom: '1px solid rgba(124,92,191,0.2)',
                display: 'flex',
                alignItems: 'stretch',
                padding: '4px 0',
                gap: '2px',
                opacity: 0.6
              }}>
                {[1,3,2,1,4,1,2,3,1,2,4,1,2,1,3,2,1,4,1,2].map((w, i) => (
                  <div key={i} style={{ width: `${w}px`, background: 'var(--primary-dark)', flexGrow: 1 }} />
                ))}
              </div>
              <div style={{ textAlign: 'center', fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px' }}>
                SMART-SYS-{ticketPrintout.slotId}-{ticketPrintout.plate}
              </div>
            </div>

            <button className="btn" style={{ width: '100%' }} onClick={() => setTicketPrintout(null)}>
              Close Ticket Preview
            </button>
          </div>
        </div>
      )}

      {/* Payment and QR Modal */}
      {paymentModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '380px' }}>
            <h3 className="modal-title">
              {paymentSuccess ? 'Payment Processed!' : 'Scan QR to Pay'}
            </h3>
            <p className="modal-subtitle">
              {paymentSuccess ? 'Thank you! Enjoy your trip.' : `Scan the UPI code to transfer`}
            </p>

            {paymentSuccess ? (
              <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '2px solid var(--success)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--success-hover)',
                  marginBottom: '16px',
                  animation: 'pulse 1s infinite alternate'
                }}>
                  <Check size={32} />
                </div>
                <strong style={{ color: 'var(--success-hover)' }}>Exit Gate Released!</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  Auto-closing gateway in 2 seconds...
                </span>
              </div>
            ) : (
              <div>
                <div className="qr-code-frame">
                  {renderQRCode(checkoutSession.plateNumber, calculateFees())}
                </div>
                
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
                  Amount: ₹{calculateFees().toFixed(0)}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn" 
                    style={{ flex: 1 }} 
                    onClick={() => setPaymentModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ flex: 1 }} 
                    onClick={handlePaymentComplete}
                  >
                    Simulate Pay
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
