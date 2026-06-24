import { useState, useEffect } from 'react';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import VehicleList from './components/VehicleList';
import GuestPortal from './components/GuestPortal';

// Seed initial dataset if storage is empty
const INITIAL_SLOTS = [];
// A1 to A40: Standard
for (let i = 1; i <= 40; i++) {
  INITIAL_SLOTS.push({ id: `A${i}`, type: 'standard', isOccupied: false });
}
// B1 to B10: EV Charging
for (let i = 1; i <= 10; i++) {
  INITIAL_SLOTS.push({ id: `B${i}`, type: 'ev', isOccupied: false });
}
// C1 to C10: Disabled
for (let i = 1; i <= 10; i++) {
  INITIAL_SLOTS.push({ id: `C${i}`, type: 'disabled', isOccupied: false });
}

// Generate yesterday's date
const YESTERDAY = new Date();
YESTERDAY.setDate(YESTERDAY.getDate() - 1);

// Generate today's date
const TODAY = new Date();

const INITIAL_LOGS = [
  // Exited yesterday (adds to yesterday's revenue)
  {
    id: 'log-1',
    plateNumber: 'NY-VIP-99',
    slotId: 'A12',
    slotType: 'standard',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 9, 30).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 13, 0).toISOString(),
    fee: 14.00, // 3.5 hrs * $4
    status: 'completed'
  },
  {
    id: 'log-2',
    plateNumber: 'CA-CHARGE-5',
    slotId: 'B3',
    slotType: 'ev',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 8, 0).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 12, 30).toISOString(),
    fee: 27.00, // 4.5 hrs * $6
    status: 'completed'
  },
  {
    id: 'log-3',
    plateNumber: 'TX-DIS-02',
    slotId: 'C1',
    slotType: 'disabled',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 14, 15).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 16, 45).toISOString(),
    fee: 6.00, // 3 hrs (rounded up) * $2
    status: 'completed'
  },
  {
    id: 'log-4',
    plateNumber: 'FL-PLATE-44',
    slotId: 'A15',
    slotType: 'standard',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 10, 0).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 18, 0).toISOString(),
    fee: 32.00, // 8 hrs * $4
    status: 'completed'
  },
  {
    id: 'log-5',
    plateNumber: 'WA-ECO-88',
    slotId: 'B7',
    slotType: 'ev',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 16, 0).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 19, 0).toISOString(),
    fee: 18.00, // 3 hrs * $6
    status: 'completed'
  },

  // Exited today (adds to today's revenue)
  {
    id: 'log-6',
    plateNumber: 'VIP-BOSS-1',
    slotId: 'A20',
    slotType: 'standard',
    entryTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 7, 0).toISOString(),
    exitTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 11, 0).toISOString(),
    fee: 16.00, // 4 hrs * $4
    status: 'completed'
  },
  {
    id: 'log-7',
    plateNumber: 'EV-TESLA-9',
    slotId: 'B1',
    slotType: 'ev',
    entryTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 8, 30).toISOString(),
    exitTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12, 0).toISOString(),
    fee: 21.00, // 3.5 hrs * $6
    status: 'completed'
  },
  {
    id: 'log-8',
    plateNumber: 'AZ-BLUE-3',
    slotId: 'A25',
    slotType: 'standard',
    entryTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 15).toISOString(),
    exitTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12, 45).toISOString(),
    fee: 12.00, // 3 hrs * $4
    status: 'completed'
  },

  // Active Parking logs (still parked)
  {
    id: 'log-9',
    plateNumber: 'AI-OCR-404',
    slotId: 'A5',
    slotType: 'standard',
    entryTime: new Date(TODAY.getTime() - 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-10',
    plateNumber: 'EV-HYUNDAI-2',
    slotId: 'B2',
    slotType: 'ev',
    entryTime: new Date(TODAY.getTime() - 1.2 * 60 * 60 * 1000).toISOString(), // 1.2 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-11',
    plateNumber: 'HELP-WHEEL-1',
    slotId: 'C5',
    slotType: 'disabled',
    entryTime: new Date(TODAY.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-12',
    plateNumber: 'NY-FAST-100',
    slotId: 'A10',
    slotType: 'standard',
    entryTime: new Date(TODAY.getTime() - 0.5 * 60 * 60 * 1000).toISOString(), // 30 mins ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-13',
    plateNumber: 'VIP-GUEST-7',
    slotId: 'A36',
    slotType: 'standard',
    entryTime: new Date(TODAY.getTime() - 5.8 * 60 * 60 * 1000).toISOString(), // 5.8 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  }
];

export default function App() {
  const [view, setView] = useState('guest'); // 'guest' | 'admin'
  const [adminSubView, setAdminSubView] = useState('dashboard'); // 'dashboard' | 'vehicles'
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Core system databases
  const [slots, setSlots] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueYesterday, setRevenueYesterday] = useState(0);

  // Initialize DB from LocalStorage or seed data
  useEffect(() => {
    const storedSlots = localStorage.getItem('ai_parking_slots');
    const storedLogs = localStorage.getItem('ai_parking_logs');

    let loadedSlots = [];
    let loadedLogs = [];

    if (storedSlots && storedLogs) {
      loadedSlots = JSON.parse(storedSlots);
      loadedLogs = JSON.parse(storedLogs);
    } else {
      // Seed databases
      loadedLogs = [...INITIAL_LOGS];
      loadedSlots = [...INITIAL_SLOTS];
      
      // Update seeded slots status based on active logs
      loadedLogs.forEach(log => {
        if (log.status === 'active') {
          const slot = loadedSlots.find(s => s.id === log.slotId);
          if (slot) slot.isOccupied = true;
        }
      });

      localStorage.setItem('ai_parking_slots', JSON.stringify(loadedSlots));
      localStorage.setItem('ai_parking_logs', JSON.stringify(loadedLogs));
    }

    setSlots(loadedSlots);
    setParkings(loadedLogs);
  }, []);

  // Compute revenues dynamically whenever parkings state changes
  useEffect(() => {
    if (parkings.length === 0) return;

    let revToday = 0;
    let revYesterday = 0;
    
    const startOfToday = new Date();
    startOfToday.setHours(0,0,0,0);

    const startOfYesterday = new Date();
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0,0,0,0);

    parkings.forEach(log => {
      if (log.status === 'completed' && log.fee) {
        const exitDate = new Date(log.exitTime);
        if (exitDate >= startOfToday) {
          revToday += log.fee;
        } else if (exitDate >= startOfYesterday && exitDate < startOfToday) {
          revYesterday += log.fee;
        }
      }
    });

    setRevenueToday(revToday);
    setRevenueYesterday(revYesterday);
    
    // Save to local storage on edits
    localStorage.setItem('ai_parking_logs', JSON.stringify(parkings));
  }, [parkings]);

  useEffect(() => {
    if (slots.length === 0) return;
    localStorage.setItem('ai_parking_slots', JSON.stringify(slots));
  }, [slots]);

  // Core action: check-in a vehicle
  const handleCheckIn = (plateNumber, type) => {
    // 1. Check if plate is already active in parking
    const isAlreadyParked = parkings.some(p => p.plateNumber === plateNumber && p.status === 'active');
    if (isAlreadyParked) {
      return { success: false, error: `Vehicle ${plateNumber} is already checked-in.` };
    }

    // 2. Find empty slot of requested type
    const emptySlot = slots.find(s => s.type === type && !s.isOccupied);
    if (!emptySlot) {
      return { success: false, error: `No empty ${type.toUpperCase()} slots are currently available.` };
    }

    // 3. Occupy slot
    const updatedSlots = slots.map(s => {
      if (s.id === emptySlot.id) {
        return { ...s, isOccupied: true };
      }
      return s;
    });

    // 4. Create check-in log
    const newParking = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      plateNumber: plateNumber.toUpperCase(),
      slotId: emptySlot.id,
      slotType: type,
      entryTime: new Date().toISOString(),
      exitTime: null,
      fee: null,
      status: 'active'
    };

    setSlots(updatedSlots);
    setParkings(prev => [newParking, ...prev]);

    return { success: true, parking: newParking };
  };

  // Core action: complete payment check-out
  const handleCheckOutSuccess = (plateNumber, fee) => {
    const activeParking = parkings.find(p => p.plateNumber === plateNumber && p.status === 'active');
    if (!activeParking) {
      return { success: false, error: 'Vehicle record not found.' };
    }

    // Free the slot
    const updatedSlots = slots.map(s => {
      if (s.id === activeParking.slotId) {
        return { ...s, isOccupied: false };
      }
      return s;
    });

    // Update logging record
    const updatedParkings = parkings.map(p => {
      if (p.id === activeParking.id) {
        return {
          ...p,
          status: 'completed',
          exitTime: new Date().toISOString(),
          fee: fee
        };
      }
      return p;
    });

    setSlots(updatedSlots);
    setParkings(updatedParkings);

    return { success: true };
  };

  // Admin Console Simulator: Generate random car entry
  const handleSimulateCheckIn = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const randomPlate = 
      letters[Math.floor(Math.random() * 26)] + 
      letters[Math.floor(Math.random() * 26)] + '-' + 
      Math.floor(100 + Math.random() * 900) + '-' + 
      letters[Math.floor(Math.random() * 26)] + 
      letters[Math.floor(Math.random() * 26)];

    const types = ['standard', 'standard', 'standard', 'ev', 'disabled'];
    const randomType = types[Math.floor(Math.random() * types.length)];

    const result = handleCheckIn(randomPlate, randomType);
    if (!result.success) {
      alert(`Simulation failed: ${result.error}`);
    }
  };

  // Admin Console Simulator: Generate random check-out of an active vehicle
  const handleSimulateCheckOut = (specificPlate = null) => {
    let activePlate = specificPlate;

    if (!activePlate) {
      const activeVehicles = parkings.filter(p => p.status === 'active');
      if (activeVehicles.length === 0) return;
      activePlate = activeVehicles[Math.floor(Math.random() * activeVehicles.length)].plateNumber;
    }

    const activeSession = parkings.find(p => p.plateNumber === activePlate && p.status === 'active');
    if (!activeSession) return;

    // Simulate 1 to 6 hours parked
    const hours = Math.floor(1 + Math.random() * 5);
    const rate = activeSession.slotType === 'ev' ? 6 : activeSession.slotType === 'disabled' ? 2 : 4;
    const computedFee = hours * rate;

    // Mock check-out success
    handleCheckOutSuccess(activePlate, computedFee);
  };

  // Admin Log Out
  const handleLogOut = () => {
    setIsLoggedIn(false);
  };

  return (
    <>
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-logo">🅿️</div>
          <div>
            <span className="brand-name">Antigravity Smart Parking</span>
            <div style={{ fontSize: '9px', color: 'var(--cyan-hover)', fontFamily: 'monospace', letterSpacing: '1px' }}>
              WEEK_1_CORE_AI_ON
            </div>
          </div>
        </div>

        <div className="nav-links">
          {/* Main Portal Toggle */}
          <button 
            className={`btn ${view === 'guest' ? 'btn-active' : ''}`}
            onClick={() => setView('guest')}
          >
            👤 Guest Portal
          </button>

          <button 
            className={`btn ${view === 'admin' ? 'btn-active' : ''}`}
            onClick={() => setView('admin')}
            style={{
              borderColor: view === 'admin' ? 'var(--primary)' : ''
            }}
          >
            ⚙️ Admin Panel
          </button>

          <span style={{ margin: '0 8px', width: '1px', height: '24px', background: 'var(--border-color)' }}></span>

          {/* Active view label */}
          {view === 'admin' ? (
            isLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="role-badge admin">Admin Mode</span>
                <button className="btn btn-sm" onClick={handleLogOut} style={{ padding: '6px 12px' }}>
                  Log Out
                </button>
              </div>
            ) : (
              <span className="role-badge guest" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'var(--warning)', color: '#fbbf24' }}>
                Locked
              </span>
            )
          ) : (
            <span className="role-badge guest">Guest Mode</span>
          )}
        </div>
      </nav>

      {/* Main Content Render */}
      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {view === 'guest' ? (
          /* Guest Area */
          <GuestPortal 
            parkings={parkings}
            slots={slots}
            onCheckIn={handleCheckIn}
            onCheckOutSuccess={handleCheckOutSuccess}
          />
        ) : (
          /* Admin Area */
          !isLoggedIn ? (
            <AdminLogin onLoginSuccess={() => setIsLoggedIn(true)} />
          ) : (
            <div>
              {/* Admin Inner Menu */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                <button 
                  className={`btn ${adminSubView === 'dashboard' ? 'btn-primary' : ''}`}
                  onClick={() => setAdminSubView('dashboard')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  📈 Core Dashboard
                </button>
                <button 
                  className={`btn ${adminSubView === 'vehicles' ? 'btn-primary' : ''}`}
                  onClick={() => setAdminSubView('vehicles')}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  📋 Vehicle Directory
                </button>
              </div>

              {/* View Selection */}
              {adminSubView === 'dashboard' ? (
                <AdminDashboard 
                  parkings={parkings}
                  slots={slots}
                  onSimulateCheckIn={handleSimulateCheckIn}
                  onSimulateCheckOut={() => handleSimulateCheckOut(null)}
                  revenueToday={revenueToday}
                  revenueYesterday={revenueYesterday}
                />
              ) : (
                <VehicleList 
                  parkings={parkings}
                  onCheckout={(plate) => handleSimulateCheckOut(plate)}
                />
              )}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>
          © 2026 Antigravity AI Smart Parking Systems. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="#" className="link-hover" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" className="link-hover" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </footer>
    </>
  );
}
