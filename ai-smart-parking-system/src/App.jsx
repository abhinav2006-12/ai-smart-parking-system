import { useState, useEffect } from 'react';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import VehicleList from './components/VehicleList';
import GuestPortal from './components/GuestPortal';
import BlueprintEditor from './components/BlueprintEditor';
import { Logo, Guest, Admin, Dashboard, Logs, Map } from './components/Icons';

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
  // Exited yesterday (adds to yesterday's revenue in INR)
  {
    id: 'log-1',
    plateNumber: 'DL-3C-AB-1234',
    slotId: 'A12',
    slotType: 'standard',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 9, 30).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 13, 0).toISOString(),
    fee: 140.00, // 3.5 hrs * ₹40
    status: 'completed'
  },
  {
    id: 'log-2',
    plateNumber: 'MH-12-CD-5678',
    slotId: 'B3',
    slotType: 'ev',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 8, 0).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 12, 30).toISOString(),
    fee: 270.00, // 4.5 hrs * ₹60
    status: 'completed'
  },
  {
    id: 'log-3',
    plateNumber: 'KL-07-XY-9999',
    slotId: 'C1',
    slotType: 'disabled',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 14, 15).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 16, 45).toISOString(),
    fee: 60.00, // 3 hrs * ₹20
    status: 'completed'
  },
  {
    id: 'log-4',
    plateNumber: 'KA-03-AA-1111',
    slotId: 'A15',
    slotType: 'standard',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 10, 0).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 18, 0).toISOString(),
    fee: 320.00, // 8 hrs * ₹40
    status: 'completed'
  },
  {
    id: 'log-5',
    plateNumber: 'HR-26-BC-7890',
    slotId: 'B7',
    slotType: 'ev',
    entryTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 16, 0).toISOString(),
    exitTime: new Date(YESTERDAY.getFullYear(), YESTERDAY.getMonth(), YESTERDAY.getDate(), 19, 0).toISOString(),
    fee: 180.00, // 3 hrs * ₹60
    status: 'completed'
  },

  // Exited today (adds to today's revenue in INR)
  {
    id: 'log-6',
    plateNumber: 'UP-16-BD-8800',
    slotId: 'A20',
    slotType: 'standard',
    entryTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 7, 0).toISOString(),
    exitTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 11, 0).toISOString(),
    fee: 160.00, // 4 hrs * ₹40
    status: 'completed'
  },
  {
    id: 'log-7',
    plateNumber: 'MH-02-EE-3344',
    slotId: 'B1',
    slotType: 'ev',
    entryTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 8, 30).toISOString(),
    exitTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12, 0).toISOString(),
    fee: 210.00, // 3.5 hrs * ₹60
    status: 'completed'
  },
  {
    id: 'log-8',
    plateNumber: 'DL-01-A-1002',
    slotId: 'A25',
    slotType: 'standard',
    entryTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 10, 15).toISOString(),
    exitTime: new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate(), 12, 45).toISOString(),
    fee: 120.00, // 3 hrs * ₹40
    status: 'completed'
  },

  // Active Parking logs (still parked)
  {
    id: 'log-9',
    plateNumber: 'MH-14-AA-1212',
    slotId: 'A5',
    slotType: 'standard',
    entryTime: new Date(TODAY.getTime() - 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-10',
    plateNumber: 'KA-51-MM-0099',
    slotId: 'B2',
    slotType: 'ev',
    entryTime: new Date(TODAY.getTime() - 1.2 * 60 * 60 * 1000).toISOString(), // 1.2 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-11',
    plateNumber: 'KL-01-CB-4545',
    slotId: 'C5',
    slotType: 'disabled',
    entryTime: new Date(TODAY.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-12',
    plateNumber: 'DL-4C-K-3000',
    slotId: 'A10',
    slotType: 'standard',
    entryTime: new Date(TODAY.getTime() - 0.5 * 60 * 60 * 1000).toISOString(), // 30 mins ago
    exitTime: null,
    fee: null,
    status: 'active'
  },
  {
    id: 'log-13',
    plateNumber: 'HR-51-Q-6677',
    slotId: 'A36',
    slotType: 'standard',
    entryTime: new Date(TODAY.getTime() - 5.8 * 60 * 60 * 1000).toISOString(), // 5.8 hours ago
    exitTime: null,
    fee: null,
    status: 'active'
  }
];

const generateDefaultBlueprint = () => {
  const rows = 10;
  const cols = 12;
  const grid = Array(rows).fill(null).map(() => Array(cols).fill(null).map(() => ({ type: 'floor', slotId: null })));

  // Entry Gate at (0, 0) and (9, 11)
  grid[0][0] = { type: 'gate', slotId: null };
  grid[9][11] = { type: 'gate', slotId: null };

  // Driveways / roads loop
  for (let i = 0; i < 12; i++) {
    grid[0][i] = { type: 'road', slotId: null };
    grid[9][i] = { type: 'road', slotId: null };
  }
  for (let i = 0; i < 10; i++) {
    grid[i][0] = { type: 'road', slotId: null };
    grid[i][11] = { type: 'road', slotId: null };
  }
  for (let i = 2; i <= 7; i++) {
    grid[i][5] = { type: 'road', slotId: null };
    grid[i][6] = { type: 'road', slotId: null };
  }

  // Walls / Pillars in the center
  grid[3][3] = { type: 'wall', slotId: null };
  grid[3][8] = { type: 'wall', slotId: null };
  grid[6][3] = { type: 'wall', slotId: null };
  grid[6][8] = { type: 'wall', slotId: null };

  // Slots mapping
  const slotsMapping = [
    { r: 1, c: 1, type: 'C', idx: 1 },
    { r: 1, c: 2, type: 'C', idx: 2 },
    { r: 1, c: 3, type: 'C', idx: 3 },
    { r: 1, c: 4, type: 'C', idx: 4 },
    
    { r: 1, c: 7, type: 'B', idx: 1 },
    { r: 1, c: 8, type: 'B', idx: 2 },
    { r: 1, c: 9, type: 'B', idx: 3 },
    { r: 1, c: 10, type: 'B', idx: 4 },

    { r: 2, c: 1, type: 'A', idx: 1 },
    { r: 2, c: 2, type: 'A', idx: 2 },
    { r: 2, c: 3, type: 'A', idx: 3 },
    { r: 2, c: 4, type: 'A', idx: 4 },
    { r: 2, c: 7, type: 'A', idx: 5 },
    { r: 2, c: 8, type: 'A', idx: 6 },
    { r: 2, c: 9, type: 'A', idx: 7 },
    { r: 2, c: 10, type: 'A', idx: 8 },

    { r: 4, c: 2, type: 'A', idx: 9 },
    { r: 4, c: 3, type: 'A', idx: 10 },
    { r: 4, c: 4, type: 'A', idx: 11 },
    { r: 4, c: 7, type: 'A', idx: 12 },
    { r: 4, c: 8, type: 'A', idx: 13 },
    { r: 4, c: 9, type: 'A', idx: 14 },

    { r: 7, c: 2, type: 'A', idx: 15 },
    { r: 7, c: 3, type: 'A', idx: 16 },
    { r: 7, c: 4, type: 'A', idx: 17 },
    { r: 7, c: 7, type: 'A', idx: 18 },
    { r: 7, c: 8, type: 'A', idx: 19 },
    { r: 7, c: 9, type: 'A', idx: 20 },

    { r: 8, c: 1, type: 'A', idx: 21 },
    { r: 8, c: 2, type: 'A', idx: 22 },
    { r: 8, c: 3, type: 'A', idx: 23 },
    { r: 8, c: 4, type: 'A', idx: 24 },
    
    { r: 8, c: 7, type: 'B', idx: 5 },
    { r: 8, c: 8, type: 'B', idx: 6 },
    { r: 8, c: 9, type: 'B', idx: 7 },
    { r: 8, c: 10, type: 'B', idx: 8 }
  ];

  slotsMapping.forEach(s => {
    grid[s.r][s.c] = { type: 'slot', slotId: `${s.type}${s.idx}` };
  });

  return grid;
};

export default function App() {
  const [view, setView] = useState('guest'); // 'guest' | 'admin'
  const [adminSubView, setAdminSubView] = useState('dashboard'); // 'dashboard' | 'vehicles' | 'blueprint'
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Core system databases
  const [slots, setSlots] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [blueprint, setBlueprint] = useState([]);
  const [revenueToday, setRevenueToday] = useState(0);
  const [revenueYesterday, setRevenueYesterday] = useState(0);

  // Initialize DB from LocalStorage or seed data
  useEffect(() => {
    const storedSlots = localStorage.getItem('ai_parking_slots');
    const storedLogs = localStorage.getItem('ai_parking_logs');
    const storedBlueprint = localStorage.getItem('ai_parking_blueprint');

    let loadedSlots = [];
    let loadedLogs = [];
    let loadedBlueprint = [];

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

    if (storedBlueprint) {
      loadedBlueprint = JSON.parse(storedBlueprint);
    } else {
      loadedBlueprint = generateDefaultBlueprint();
      localStorage.setItem('ai_parking_blueprint', JSON.stringify(loadedBlueprint));
    }

    setSlots(loadedSlots);
    setParkings(loadedLogs);
    setBlueprint(loadedBlueprint);
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

  // Admin Console Simulator: Generate random Indian car entry
  const handleSimulateCheckIn = () => {
    const states = ['DL', 'MH', 'KA', 'KL', 'HR', 'UP', 'GJ', 'TN', 'AP', 'TS'];
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    const randomState = states[Math.floor(Math.random() * states.length)];
    const randomCode = Math.floor(1 + Math.random() * 14).toString().padStart(2, '0');
    const randomLetters = alphabet[Math.floor(Math.random() * 26)] + alphabet[Math.floor(Math.random() * 26)];
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    
    const randomPlate = `${randomState}-${randomCode}-${randomLetters}-${randomDigits}`;

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
    const rate = activeSession.slotType === 'ev' ? 60 : activeSession.slotType === 'disabled' ? 20 : 40;
    const computedFee = hours * rate;

    // Mock check-out success
    handleCheckOutSuccess(activePlate, computedFee);
  };

  // Admin Log Out
  const handleLogOut = () => {
    setIsLoggedIn(false);
  };

  const handleSaveBlueprint = (newBlueprint) => {
    setBlueprint(newBlueprint);
    localStorage.setItem('ai_parking_blueprint', JSON.stringify(newBlueprint));
  };

  return (
    <>
      {/* Navigation Header */}
      <nav className="navbar">
        <div className="brand">
          <div className="brand-logo" style={{ background: 'linear-gradient(135deg, #16a34a, #f97316)' }}>
            <Logo size={24} />
          </div>
          <div>
            <span className="brand-name">Smart Parking</span>
            <div style={{ fontSize: '9px', color: 'var(--cyan-hover)', fontFamily: 'monospace', letterSpacing: '1.5px' }}>
              WEEK_1_CORE_AI_ON
            </div>
          </div>
        </div>

        <div className="nav-links">
          {/* Main Portal Toggle */}
          <button 
            className={`btn ${view === 'guest' ? 'btn-active' : ''}`}
            onClick={() => setView('guest')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Guest size={16} />
            <span>Guest Portal</span>
          </button>

          <button 
            className={`btn ${view === 'admin' ? 'btn-active' : ''}`}
            onClick={() => setView('admin')}
            style={{
              borderColor: view === 'admin' ? 'var(--primary)' : '',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Admin size={16} />
            <span>Admin Panel</span>
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
      <main className="main-content">
        {view === 'guest' ? (
          /* Guest Area */
          <GuestPortal 
            parkings={parkings}
            slots={slots}
            blueprint={blueprint}
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
              <div className="tab-nav" style={{ maxWidth: '640px' }}>
                <div 
                  className={`tab-item ${adminSubView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => setAdminSubView('dashboard')}
                >
                  <Dashboard size={18} />
                  <span>Core Dashboard</span>
                </div>
                <div 
                  className={`tab-item ${adminSubView === 'vehicles' ? 'active' : ''}`}
                  onClick={() => setAdminSubView('vehicles')}
                >
                  <Logs size={18} />
                  <span>Vehicle Directory</span>
                </div>
                <div 
                  className={`tab-item ${adminSubView === 'blueprint' ? 'active' : ''}`}
                  onClick={() => setAdminSubView('blueprint')}
                >
                  <Map size={18} />
                  <span>Blueprint Editor</span>
                </div>
              </div>

              {/* View Selection */}
              {adminSubView === 'dashboard' ? (
                <AdminDashboard 
                  parkings={parkings}
                  slots={slots}
                  blueprint={blueprint}
                  onSimulateCheckIn={handleSimulateCheckIn}
                  onSimulateCheckOut={() => handleSimulateCheckOut(null)}
                  revenueToday={revenueToday}
                  revenueYesterday={revenueYesterday}
                />
              ) : adminSubView === 'vehicles' ? (
                <VehicleList 
                  parkings={parkings}
                  onCheckout={(plate) => handleSimulateCheckOut(plate)}
                />
              ) : (
                <BlueprintEditor 
                  blueprint={blueprint}
                  slots={slots}
                  onSaveBlueprint={handleSaveBlueprint}
                />
              )}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div>
          © 2026 Smart Parking Systems. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <a href="#" className="link-hover" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" className="link-hover" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>Terms of Service</a>
        </div>
      </footer>
    </>
  );
}
