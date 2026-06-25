import { useState, useEffect } from 'react';
import { Gate, Road, Wall, Brush, Check, Warning, Tools } from './Icons';

// Default unassigned slots list if map is empty
const ALL_SLOTS = [];
for (let i = 1; i <= 40; i++) ALL_SLOTS.push(`A${i}`); // Standard
for (let i = 1; i <= 10; i++) ALL_SLOTS.push(`B${i}`); // EV
for (let i = 1; i <= 10; i++) ALL_SLOTS.push(`C${i}`); // Disabled

export default function BlueprintEditor({ blueprint, onSaveBlueprint, slots = [] }) {
  const [grid, setGrid] = useState([]);
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(12);
  
  const [selectedTool, setSelectedTool] = useState('road'); // 'floor' (eraser), 'wall', 'road', 'gate', 'slot'
  const [selectedSlotId, setSelectedSlotId] = useState('');
  
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);

  // Initialize editor grid from current blueprint prop
  useEffect(() => {
    if (blueprint && blueprint.length > 0) {
      setGrid(JSON.parse(JSON.stringify(blueprint)));
      setRows(blueprint.length);
      setCols(blueprint[0].length);
    } else {
      loadPreset('helix');
    }
  }, [blueprint]);

  // Compute unassigned slots
  const getAssignedSlots = (currentGrid) => {
    const assigned = new Set();
    currentGrid.forEach(row => {
      row.forEach(cell => {
        if (cell.type === 'slot' && cell.slotId) {
          assigned.add(cell.slotId);
        }
      });
    });
    return assigned;
  };

  const assignedSlots = getAssignedSlots(grid);
  const unassignedSlots = ALL_SLOTS.filter(id => !assignedSlots.has(id));

  // Set default selected slot ID when tools/list changes
  useEffect(() => {
    if (unassignedSlots.length > 0 && !assignedSlots.has(selectedSlotId)) {
      if (!selectedSlotId || !unassignedSlots.includes(selectedSlotId)) {
        setSelectedSlotId(unassignedSlots[0]);
      }
    }
  }, [grid]);

  // Resize Grid size
  const handleResize = (newRows, newCols) => {
    const r = Math.max(6, Math.min(15, newRows));
    const c = Math.max(6, Math.min(15, newCols));
    setRows(r);
    setCols(c);

    // Create new grid structure copying old data
    const newGrid = Array(r).fill(null).map((_, rowIndex) => {
      return Array(c).fill(null).map((_, colIndex) => {
        if (grid[rowIndex] && grid[rowIndex][colIndex]) {
          return grid[rowIndex][colIndex];
        }
        return { type: 'floor', slotId: null };
      });
    });
    setGrid(newGrid);
  };

  // Paint a single cell
  const paintCell = (rowIndex, colIndex) => {
    const newGrid = [...grid];
    const targetCell = newGrid[rowIndex][colIndex];
    
    // Free slot if we are overwriting it
    let slotToFree = null;
    if (targetCell.type === 'slot' && targetCell.slotId) {
      slotToFree = targetCell.slotId;
    }

    if (selectedTool === 'slot') {
      if (!selectedSlotId) {
        triggerAlert('warning', 'Please select a Slot ID from the list to paint!');
        return;
      }
      
      // Make sure this slot isn't placed elsewhere first. If so, erase it from old spot.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (newGrid[r][c].type === 'slot' && newGrid[r][c].slotId === selectedSlotId) {
            newGrid[r][c] = { type: 'floor', slotId: null };
          }
        }
      }

      newGrid[rowIndex][colIndex] = { type: 'slot', slotId: selectedSlotId };
      
      // Auto-advance to next available slot in list
      const idx = unassignedSlots.indexOf(selectedSlotId);
      if (idx !== -1 && idx < unassignedSlots.length - 1) {
        setSelectedSlotId(unassignedSlots[idx + 1]);
      }
    } else {
      newGrid[rowIndex][colIndex] = { type: selectedTool, slotId: null };
    }

    setGrid(newGrid);
  };

  const handleCellMouseDown = (r, c) => {
    setIsMouseDown(true);
    paintCell(r, c);
  };

  const handleCellMouseEnter = (r, c) => {
    if (isMouseDown) {
      paintCell(r, c);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const triggerAlert = (type, text) => {
    setAlertMsg({ type, text });
    setTimeout(() => setAlertMsg(null), 4000);
  };

  // Save Blueprint validation and action
  const handleSave = () => {
    // 1. Check for Entrance Gate
    let gatesCount = 0;
    let slotsCount = 0;

    grid.forEach(row => {
      row.forEach(cell => {
        if (cell.type === 'gate') gatesCount++;
        if (cell.type === 'slot') slotsCount++;
      });
    });

    if (gatesCount === 0) {
      triggerAlert('danger', 'Save failed: The blueprint requires at least 1 Entrance Gate for navigation pathfinding!');
      return;
    }

    if (slotsCount === 0) {
      triggerAlert('danger', 'Save failed: Please map at least 1 parking slot onto the blueprint!');
      return;
    }

    onSaveBlueprint(grid);
    triggerAlert('success', 'Parking Blueprint saved and loaded successfully!');
  };

  // Load preset layouts
  const loadPreset = (presetType) => {
    let r = 10;
    let c = 12;
    setRows(r);
    setCols(c);

    const newGrid = Array(r).fill(null).map(() => Array(c).fill(null).map(() => ({ type: 'floor', slotId: null })));

    if (presetType === 'helix') {
      // Preset 1: Beautiful winding layout
      // Entry Gate at (0, 0) and (9, 11)
      newGrid[0][0] = { type: 'gate', slotId: null };
      newGrid[9][11] = { type: 'gate', slotId: null };

      // Driveways / roads loop
      for (let i = 0; i < 12; i++) {
        newGrid[0][i] = { type: 'road', slotId: null };
        newGrid[9][i] = { type: 'road', slotId: null };
      }
      for (let i = 0; i < 10; i++) {
        newGrid[i][0] = { type: 'road', slotId: null };
        newGrid[i][11] = { type: 'road', slotId: null };
      }
      for (let i = 2; i <= 7; i++) {
        newGrid[i][5] = { type: 'road', slotId: null };
        newGrid[i][6] = { type: 'road', slotId: null };
      }

      // Walls / Pillars in the center
      newGrid[3][3] = { type: 'wall', slotId: null };
      newGrid[3][8] = { type: 'wall', slotId: null };
      newGrid[6][3] = { type: 'wall', slotId: null };
      newGrid[6][8] = { type: 'wall', slotId: null };

      // Map standard slots A1-A24
      let standardIdx = 1;
      // Map B1-B6 (EV) and C1-C4 (Disabled)
      let evIdx = 1;
      let disabledIdx = 1;

      // Assigning slots layout cells
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
        newGrid[s.r][s.c] = { type: 'slot', slotId: `${s.type}${s.idx}` };
      });

    } else if (presetType === 'central') {
      // Preset 2: Double Winding central rows layout
      // Gates at top center & bottom center
      newGrid[0][5] = { type: 'gate', slotId: null };
      newGrid[9][6] = { type: 'gate', slotId: null };

      // Central drive ring
      for (let c = 1; c <= 10; c++) {
        newGrid[1][c] = { type: 'road', slotId: null };
        newGrid[4][c] = { type: 'road', slotId: null };
        newGrid[5][c] = { type: 'road', slotId: null };
        newGrid[8][c] = { type: 'road', slotId: null };
      }
      for (let r = 0; r < 10; r++) {
        newGrid[r][1] = { type: 'road', slotId: null };
        newGrid[r][10] = { type: 'road', slotId: null };
      }

      // Assign Standard, EV, Disabled Slots
      for (let col = 2; col <= 9; col++) {
        newGrid[2][col] = { type: 'slot', slotId: `A${col - 1}` };
        newGrid[3][col] = { type: 'slot', slotId: `A${col + 7}` };
        newGrid[6][col] = { type: 'slot', slotId: col < 6 ? `C${col - 1}` : `B${col - 5}` };
        newGrid[7][col] = { type: 'slot', slotId: `A${col + 15}` };
      }
    } else {
      // Preset 3: Blank floor grid with entrance gate
      newGrid[0][0] = { type: 'gate', slotId: null };
      newGrid[0][1] = { type: 'road', slotId: null };
    }

    setGrid(newGrid);
  };

  return (
    <div>
      {/* Configuration Header Controls */}
      <div className="card" style={{ marginBottom: '24px', padding: '16px', borderLeft: '4px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
            <Tools size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 800, marginBottom: '4px', fontFamily: 'var(--font-title)' }}>
                Visual Grid Blueprint Setup
              </h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 500 }}>
                Adjust grid size, paint roads, gates, pillars, and place parking slots onto the map coordinate layout.
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label className="form-label" style={{ margin: 0, fontSize: '12px' }}>Grid Size:</label>
            <button 
              className="btn btn-sm" 
              onClick={() => handleResize(rows - 1, cols)}
              disabled={rows <= 6}
              style={{ padding: '4px 8px' }}
            >
              R-
            </button>
            <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{rows}x{cols}</span>
            <button 
              className="btn btn-sm" 
              onClick={() => handleResize(rows + 1, cols)}
              disabled={rows >= 15}
              style={{ padding: '4px 8px' }}
            >
              R+
            </button>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <button 
              className="btn btn-sm" 
              onClick={() => handleResize(rows, cols - 1)}
              disabled={cols <= 6}
              style={{ padding: '4px 8px' }}
            >
              C-
            </button>
            <button 
              className="btn btn-sm" 
              onClick={() => handleResize(rows, cols + 1)}
              disabled={cols >= 15}
              style={{ padding: '4px 8px' }}
            >
              C+
            </button>
          </div>
        </div>
      </div>

      {/* Main Designer Layout */}
      <div className="blueprint-layout">
        {/* Left Side: Brushes Palette */}
        <div className="blueprint-palette-card">
          <h4 style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '10px', fontSize: '14px', fontWeight: 800 }}>
            🎨 Paint Brushes
          </h4>
          
          <div className="blueprint-tools-list">
            <button 
              className={`blueprint-tool-btn ${selectedTool === 'road' ? 'active' : ''}`}
              onClick={() => setSelectedTool('road')}
            >
              <div className="blueprint-tool-indicator indicator-road">
                <Road size={14} />
              </div>
              <span>Driveway / Road</span>
            </button>

            <button 
              className={`blueprint-tool-btn ${selectedTool === 'wall' ? 'active' : ''}`}
              onClick={() => setSelectedTool('wall')}
            >
              <div className="blueprint-tool-indicator indicator-wall">
                <Wall size={14} />
              </div>
              <span>Wall / Pillar</span>
            </button>

            <button 
              className={`blueprint-tool-btn ${selectedTool === 'gate' ? 'active' : ''}`}
              onClick={() => setSelectedTool('gate')}
            >
              <div className="blueprint-tool-indicator indicator-gate">
                <Gate size={14} />
              </div>
              <span>Entrance Gate</span>
            </button>

            <button 
              className={`blueprint-tool-btn ${selectedTool === 'slot' ? 'active' : ''}`}
              onClick={() => setSelectedTool('slot')}
            >
              <div className="blueprint-tool-indicator indicator-slot">
                <span>P</span>
              </div>
              <span style={{ flex: 1 }}>Assign Slot</span>
            </button>

            {/* Active Slot paint picker */}
            {selectedTool === 'slot' && (
              <div style={{ padding: '8px 10px', background: 'var(--bg-main)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', animation: 'fade-in 0.2s' }}>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Select Slot to paint:</span>
                <select 
                  className="form-control" 
                  style={{ padding: '6px', fontSize: '12px' }}
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                >
                  {unassignedSlots.map(id => (
                    <option key={id} value={id}>
                      Slot {id} ({id.startsWith('A') ? 'Standard' : id.startsWith('B') ? 'EV Bay' : 'Disabled'})
                    </option>
                  ))}
                  {unassignedSlots.length === 0 && (
                    <option value="">All slots assigned!</option>
                  )}
                </select>
              </div>
            )}

            <button 
              className={`blueprint-tool-btn ${selectedTool === 'floor' ? 'active' : ''}`}
              onClick={() => setSelectedTool('floor')}
            >
              <div className="blueprint-tool-indicator indicator-eraser">
                🧹
              </div>
              <span>Eraser</span>
            </button>
          </div>

          <div style={{ marginTop: '24px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '16px' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 800, marginBottom: '12px' }}>
              📍 Preset Layouts
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-sm" style={{ width: '100%' }} onClick={() => loadPreset('helix')}>
                Helix Annex Loop
              </button>
              <button className="btn btn-sm" style={{ width: '100%' }} onClick={() => loadPreset('central')}>
                Central Ring Hub
              </button>
              <button className="btn btn-sm" style={{ width: '100%' }} onClick={() => loadPreset('clear')}>
                Clear Grid
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Grid Drawing Area */}
        <div className="blueprint-canvas-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800 }}>
              Blueprint Grid Canvas
            </h4>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Click and drag mouse to paint roads, paths, and walls.
            </span>
          </div>

          {/* Banner notification Alerts */}
          {alertMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: alertMsg.type === 'success' ? 'var(--success-bg)' : alertMsg.type === 'danger' ? 'var(--danger-bg)' : 'var(--warning-bg)',
              color: alertMsg.type === 'success' ? 'var(--success-hover)' : alertMsg.type === 'danger' ? 'var(--danger)' : 'var(--warning)',
              border: '1px solid currentColor',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              {alertMsg.type === 'success' ? <Check size={16} /> : <Warning size={16} />}
              <span>{alertMsg.text}</span>
            </div>
          )}

          {/* Painter canvas wrapper */}
          <div className="blueprint-grid-wrapper">
            <div
              className="blueprint-grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                width: '100%',
                maxWidth: `${cols * 44}px`
              }}
            >
              {grid.map((rowArr, r) =>
                rowArr.map((cell, c) => {
                  let cellClass = 'blueprint-cell';
                  let content = null;

                  if (cell.type === 'floor') {
                    cellClass += ' cell-floor';
                  } else if (cell.type === 'wall') {
                    cellClass += ' cell-wall';
                  } else if (cell.type === 'road') {
                    cellClass += ' cell-road';
                  } else if (cell.type === 'gate') {
                    cellClass += ' cell-gate';
                    content = <Gate size={12} />;
                  } else if (cell.type === 'slot') {
                    cellClass += ` cell-slot-assigned slot-${cell.slotId.startsWith('A') ? 'standard' : cell.slotId.startsWith('B') ? 'ev' : 'disabled'}`;
                    content = <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{cell.slotId}</span>;
                  }

                  return (
                    <div
                      key={`${r}-${c}`}
                      className={cellClass}
                      onMouseDown={() => handleCellMouseDown(r, c)}
                      onMouseEnter={() => handleCellMouseEnter(r, c)}
                      style={{ cursor: 'crosshair' }}
                    >
                      {content}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '12px' }}>
            <div style={{ marginRight: 'auto', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              Mapped Slots: <strong>{assignedSlots.size}</strong> placed | <strong>{unassignedSlots.length}</strong> remaining
            </div>
            
            <button className="btn" onClick={() => loadPreset('helix')}>
              Reset Changes
            </button>
            <button className="btn btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={16} />
              <span>Save & Publish Blueprint</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
