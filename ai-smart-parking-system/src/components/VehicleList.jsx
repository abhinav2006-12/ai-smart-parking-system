import { useState } from 'react';

export default function VehicleList({ parkings, onCheckout }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Helper: format date
  const formatTime = (isoString) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper: calculate duration
  const getDuration = (entryStr, exitStr) => {
    const entry = new Date(entryStr);
    const exit = exitStr ? new Date(exitStr) : new Date();
    const diffMs = exit - entry;
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Filter parkings list
  const filteredParkings = parkings.filter(p => {
    const matchesSearch = p.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.slotId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.slotType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Pagination calculations
  const totalItems = filteredParkings.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedParkings = filteredParkings.slice(startIndex, startIndex + pageSize);

  // Reset page when filter/search changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val) => {
    setTypeFilter(val);
    setCurrentPage(1);
  };

  return (
    <div className="card">
      <div className="section-title">
        <span>📋 Vehicle Records & Logs</span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Found {totalItems} entries
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="🔍 Search Plate Number or Slot..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Status Filter */}
        <div>
          <select 
            className="form-control" 
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ width: '150px', padding: '10px 16px' }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Parking</option>
            <option value="completed">Exited / Paid</option>
          </select>
        </div>

        {/* Space Type Filter */}
        <div>
          <select 
            className="form-control" 
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            style={{ width: '160px', padding: '10px 16px' }}
          >
            <option value="all">All Slot Types</option>
            <option value="standard">Standard Slots</option>
            <option value="ev">EV Charging Bay</option>
            <option value="disabled">Disabled Slots</option>
          </select>
        </div>

        {/* Page Size selector */}
        <div>
          <select 
            className="form-control" 
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ width: '100px', padding: '10px 16px' }}
          >
            <option value={5}>5 / page</option>
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
          </select>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="table-responsive">
        <table className="table-custom">
          <thead>
            <tr>
              <th>Plate Number</th>
              <th>Slot Location</th>
              <th>Slot Type</th>
              <th>Entry Time</th>
              <th>Exit Time</th>
              <th>Duration</th>
              <th>Total Fees</th>
              <th>Status</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedParkings.length > 0 ? (
              paginatedParkings.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong style={{ fontFamily: 'var(--font-title)', letterSpacing: '0.5px', color: '#fff' }}>
                      {p.plateNumber}
                    </strong>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{p.slotId}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px' }}>
                      {p.slotType === 'ev' ? '⚡ EV Bay' : p.slotType === 'disabled' ? '♿ Disabled' : '🚗 Standard'}
                    </span>
                  </td>
                  <td>{formatTime(p.entryTime)}</td>
                  <td>{formatTime(p.exitTime)}</td>
                  <td>{getDuration(p.entryTime, p.exitTime)}</td>
                  <td>
                    <strong style={{ color: p.fee ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {p.fee ? `$${p.fee.toFixed(2)}` : '—'}
                    </strong>
                  </td>
                  <td>
                    <span className={`badge ${
                      p.status === 'completed' ? 'badge-success' : p.status === 'active' ? 'badge-info' : 'badge-warning'
                    }`}>
                      {p.status === 'completed' ? 'Exited' : p.status === 'active' ? 'Parked' : 'Unpaid'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {p.status === 'active' ? (
                      <button
                        className="btn btn-sm"
                        style={{
                          borderColor: 'var(--warning)',
                          color: '#fbbf24',
                          padding: '4px 10px',
                          fontSize: '11px',
                          display: 'inline-flex'
                        }}
                        onClick={() => {
                          if (confirm(`Trigger checkout workflow for plate ${p.plateNumber}?`)) {
                            onCheckout(p.plateNumber);
                          }
                        }}
                      >
                        Checkout
                      </button>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Archived</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                  🚫 No matching vehicle records found. Try adjusting filters or simulators.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="pagination-container">
        <div>
          Showing {totalItems > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + pageSize, totalItems)} of {totalItems} entries
        </div>
        <div className="pagination-buttons">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
