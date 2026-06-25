import { useState } from 'react';
import { EV, Disabled, Car, Gate as GateIcon, Warning } from './Icons';

export default function InteractiveMap({
  blueprint,
  slots = [],
  parkings = [],
  highlightedSlotId = null,
  onSlotClick = null,
  adminCheckout = null,
  isGuestView = false
}) {
  const [hoveredCell, setHoveredCell] = useState(null);

  if (!blueprint || blueprint.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Warning size={24} style={{ color: 'var(--warning)', marginBottom: '8px' }} />
        <div>No blueprint configured. Please load or edit a blueprint in the Editor tab.</div>
      </div>
    );
  }

  const rows = blueprint.length;
  const cols = blueprint[0].length;

  // Find cell containing slotId
  const findSlotCell = (slotId) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (blueprint[r][c].type === 'slot' && blueprint[r][c].slotId === slotId) {
          return { r, c };
        }
      }
    }
    return null;
  };

  // Find all entry gates
  const findGates = () => {
    const gates = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (blueprint[r][c].type === 'gate') {
          gates.push({ r, c });
        }
      }
    }
    return gates;
  };

  // BFS Pathfinder from nearest gate to slot
  const calculatePath = (targetSlotId) => {
    if (!targetSlotId) return null;
    const target = findSlotCell(targetSlotId);
    if (!target) return null;

    const gates = findGates();
    if (gates.length === 0) return null;

    // Find the shortest path among all entrance gates
    let shortestPath = null;

    for (const gate of gates) {
      const path = findBFSPath(gate, target);
      if (path) {
        if (!shortestPath || path.length < shortestPath.length) {
          shortestPath = path;
        }
      }
    }

    return shortestPath;
  };

  const findBFSPath = (start, target) => {
    const queue = [[start]];
    const visited = new Set();
    visited.add(`${start.r},${start.c}`);

    while (queue.length > 0) {
      const path = queue.shift();
      const curr = path[path.length - 1];

      if (curr.r === target.r && curr.c === target.c) {
        return path;
      }

      // Up, Down, Left, Right
      const directions = [
        { r: curr.r - 1, c: curr.c },
        { r: curr.r + 1, c: curr.c },
        { r: curr.r, c: curr.c - 1 },
        { r: curr.r, c: curr.c + 1 }
      ];

      for (const dir of directions) {
        if (dir.r >= 0 && dir.r < rows && dir.c >= 0 && dir.c < cols) {
          const cell = blueprint[dir.r][dir.c];
          
          // Can drive on roads, gates, or the target slot itself.
          // Other walls or slots block driving.
          const isTraversable =
            cell.type === 'road' ||
            cell.type === 'gate' ||
            (dir.r === target.r && dir.c === target.c);

          const key = `${dir.r},${dir.c}`;
          if (isTraversable && !visited.has(key)) {
            visited.add(key);
            queue.push([...path, dir]);
          }
        }
      }
    }

    return null; // No path found
  };

  const activePath = calculatePath(highlightedSlotId);

  // Generate SVG path string if path exists
  const getSvgPathData = (path) => {
    if (!path || path.length === 0) return '';
    return path.map((node, index) => {
      const x = node.c + 0.5; // Offset to cell center
      const y = node.r + 0.5;
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  const getSlotDetails = (slotId) => {
    const slot = slots.find(s => s.id === slotId);
    if (!slot) return null;

    const activeLog = parkings.find(p => p.slotId === slotId && p.status === 'active');
    return {
      ...slot,
      activeLog
    };
  };

  const handleCellHover = (r, c) => {
    const cell = blueprint[r][c];
    if (cell.type === 'slot' && cell.slotId) {
      const details = getSlotDetails(cell.slotId);
      setHoveredCell({
        r,
        c,
        ...cell,
        details
      });
    } else {
      setHoveredCell({
        r,
        c,
        ...cell
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {/* Legend Block */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        fontSize: '11px',
        background: 'var(--bg-secondary)',
        padding: '10px 8px',
        borderRadius: '12px',
        boxShadow: 'var(--clay-shadow-inset)',
        gap: '8px'
      }}>
        <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <GateIcon size={12} /> Entry Gate
        </span>
        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#27252b', borderRadius: '3px' }}></span> Driveway
        </span>
        <span style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '12px', height: '12px', backgroundColor: '#3b285c', borderRadius: '3px' }}></span> Column/Wall
        </span>
        <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--success)', borderRadius: '50%' }}></span> Empty Slot
        </span>
        <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--danger)', borderRadius: '50%' }}></span> Occupied Slot
        </span>
        {highlightedSlotId && (
          <span style={{ color: 'var(--cyan)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
            <span style={{ width: '12px', height: '4px', background: 'var(--cyan)', borderRadius: '2px', display: 'inline-block' }}></span> Route Path
          </span>
        )}
      </div>

      {/* Map Interactive Area */}
      <div className="map-container-relative">
        {/* SVG Drawing Wayfinding Path */}
        {activePath && (
          <svg
            className="wayfinding-svg-overlay"
            viewBox={`0 0 ${cols} ${rows}`}
            preserveAspectRatio="none"
          >
            <path
              d={getSvgPathData(activePath)}
              className="wayfinding-line-glow"
            />
            <path
              d={getSvgPathData(activePath)}
              className="wayfinding-line-active"
            />
          </svg>
        )}

        {/* Grid Canvas */}
        <div
          className="blueprint-grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
            width: '100%',
            maxWidth: `${cols * 44}px` // scale cell size dynamically
          }}
        >
          {blueprint.map((rowArr, r) =>
            rowArr.map((cell, c) => {
              let cellClass = 'blueprint-cell';
              let content = null;
              let isOccupied = false;
              let details = null;

              if (cell.type === 'floor') {
                cellClass += ' cell-floor';
              } else if (cell.type === 'wall') {
                cellClass += ' cell-wall';
              } else if (cell.type === 'road') {
                cellClass += ' cell-road';
              } else if (cell.type === 'gate') {
                cellClass += ' cell-gate';
                content = <GateIcon size={16} />;
              } else if (cell.type === 'slot') {
                details = getSlotDetails(cell.slotId);
                isOccupied = details?.isOccupied || false;

                cellClass += ` cell-slot-assigned slot-${details?.type || 'standard'}`;
                if (isOccupied) cellClass += ' slot-occupied';

                content = (
                  <div className="cell-slot-marker">
                    <span className="cell-slot-id">{cell.slotId}</span>
                    {isOccupied ? (
                      <Car size={10} className="cell-car-icon-occupied" style={{ color: 'var(--danger)' }} />
                    ) : details?.type === 'ev' ? (
                      <EV size={8} />
                    ) : details?.type === 'disabled' ? (
                      <Disabled size={8} />
                    ) : null}
                  </div>
                );
              }

              const isHighlighted = highlightedSlotId && cell.slotId === highlightedSlotId;
              const cellStyle = isHighlighted ? {
                transform: 'scale(1.1)',
                zIndex: 3,
                boxShadow: '0 0 12px var(--cyan)',
                border: '2px solid var(--cyan)'
              } : {};

              return (
                <div
                  key={`${r}-${c}`}
                  className={cellClass}
                  style={cellStyle}
                  onMouseEnter={() => handleCellHover(r, c)}
                  onMouseLeave={() => setHoveredCell(null)}
                  onClick={() => {
                    if (cell.type === 'slot' && cell.slotId) {
                      if (onSlotClick) {
                        onSlotClick(cell.slotId);
                      }
                      // Admin shortcut checkout
                      if (!isGuestView && isOccupied && adminCheckout && details?.activeLog) {
                        if (confirm(`Check-out vehicle ${details.activeLog.plateNumber} from slot ${cell.slotId}?`)) {
                          adminCheckout(details.activeLog.plateNumber);
                        }
                      }
                    }
                  }}
                >
                  {content}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Info Inspector Box */}
      <div style={{
        padding: '14px',
        background: 'var(--bg-secondary)',
        borderRadius: '14px',
        fontSize: '12px',
        textAlign: 'left',
        minHeight: '68px',
        boxShadow: 'var(--clay-shadow-inset)'
      }}>
        {hoveredCell && hoveredCell.type === 'slot' && hoveredCell.slotId ? (
          <div>
            <div style={{ fontWeight: 'bold', color: '#fff', display: 'flex', justifyContent: 'space-between' }}>
              <span>Space {hoveredCell.slotId} [{(hoveredCell.details?.type || 'STANDARD').toUpperCase()}]</span>
              <span style={{ color: hoveredCell.details?.isOccupied ? '#f87171' : 'var(--success-hover)' }}>
                {hoveredCell.details?.isOccupied ? 'Occupied' : 'Available'}
              </span>
            </div>
            {hoveredCell.details?.isOccupied && hoveredCell.details?.activeLog ? (
              <div style={{ marginTop: '6px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Plate: <strong style={{ color: 'var(--text-primary)' }}>{hoveredCell.details.activeLog.plateNumber}</strong>
                {' | '}
                Parked: {new Date(hoveredCell.details.activeLog.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {!isGuestView && <span style={{ color: 'var(--cyan-hover)', marginLeft: '8px', cursor: 'pointer', textDecoration: 'underline' }}> (Click to Checkout)</span>}
              </div>
            ) : (
              <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
                Rate: {hoveredCell.details?.type === 'ev' ? '₹60.00/hr (Inc. Charging)' : hoveredCell.details?.type === 'disabled' ? '₹20.00/hr' : '₹40.00/hr'}
              </div>
            )}
          </div>
        ) : hoveredCell ? (
          <div style={{ color: 'var(--text-secondary)' }}>
            Grid Coordinate: Row {hoveredCell.r + 1}, Column {hoveredCell.c + 1} | Type:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{hoveredCell.type.toUpperCase()}</strong>
          </div>
        ) : (
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', height: '100%', justifyContent: 'center', gap: '6px' }}>
            <span>Hover cells for details. Click vacant slots to view path guide.</span>
          </div>
        )}
      </div>
    </div>
  );
}
