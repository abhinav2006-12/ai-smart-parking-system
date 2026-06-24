import { useState } from 'react';

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    // Simulate short network delay for realism
    setTimeout(() => {
      if (username.toLowerCase() === 'admin' && password === 'admin') {
        onLoginSuccess();
      } else {
        setError('Invalid username or password (use admin / admin)');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 0',
      minHeight: '60vh'
    }}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, var(--primary), var(--cyan))',
            borderRadius: '14px',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            color: '#fff',
            marginBottom: '16px',
            boxShadow: '0 0 20px var(--primary-glow)'
          }}>
            🔒
          </div>
          <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: 700, color: '#fff', fontSize: '24px' }}>
            Admin Portal Access
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
            Authenticate to manage slots, cameras, and vehicle logs
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            color: '#f87171',
            fontSize: '13px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          Tip: Use <code style={{ fontSize: '11px', padding: '2px 6px' }}>admin</code> / <code style={{ fontSize: '11px', padding: '2px 6px' }}>admin</code> to log in.
        </div>
      </div>
    </div>
  );
}
