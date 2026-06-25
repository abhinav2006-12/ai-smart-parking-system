const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export function getToken() {
  return localStorage.getItem('parking_token');
}

export function setToken(token) {
  localStorage.setItem('parking_token', token);
}

export function clearToken() {
  localStorage.removeItem('parking_token');
}

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    return mockRequest(path, options);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

const MOCK_KEY = 'parking_mock_sessions';

function seedMockSessions() {
  const stored = localStorage.getItem(MOCK_KEY);
  if (stored) return JSON.parse(stored);
  const now = Date.now();
  const data = [
    {
      id: 1,
      vehicle_id: 1,
      plate_number: 'DL3CAB1234',
      entry_time: new Date(now - 95 * 60 * 1000).toISOString(),
      exit_time: null,
      duration_minutes: null,
      fee_amount: null,
      status: 'ACTIVE',
      entry_image_path: null,
      exit_image_path: null,
      entry_camera_id: 1,
      exit_camera_id: null,
    },
    {
      id: 2,
      vehicle_id: 2,
      plate_number: 'MH12CD5678',
      entry_time: new Date(now - 5 * 60 * 60 * 1000).toISOString(),
      exit_time: new Date(now - 40 * 60 * 1000).toISOString(),
      duration_minutes: 260,
      fee_amount: 60,
      status: 'UNPAID',
      entry_image_path: null,
      exit_image_path: null,
      entry_camera_id: 1,
      exit_camera_id: 2,
    },
  ];
  localStorage.setItem(MOCK_KEY, JSON.stringify(data));
  return data;
}

function saveMockSessions(items) {
  localStorage.setItem(MOCK_KEY, JSON.stringify(items));
}

function normalizePlate(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function mockStats(items) {
  const today = new Date().toDateString();
  const revenueToday = items
    .filter((item) => item.exit_time && new Date(item.exit_time).toDateString() === today)
    .reduce((sum, item) => sum + Number(item.fee_amount || 0), 0);
  const revenueTotal = items.reduce((sum, item) => sum + Number(item.fee_amount || 0), 0);
  const active = items.filter((item) => item.status === 'ACTIVE').length;
  return {
    active_count: active,
    completed_count: items.filter((item) => item.status === 'COMPLETED').length,
    paid_count: items.filter((item) => item.status === 'PAID').length,
    unpaid_count: items.filter((item) => item.status === 'UNPAID').length,
    occupancy_percent: Number(((active / 120) * 100).toFixed(2)),
    total_capacity: 120,
    revenue_today: revenueToday,
    revenue_total: revenueTotal,
    daily_revenue: [{ date: new Date().toISOString().slice(0, 10), revenue: revenueToday }],
  };
}

function mockInvoice(session) {
  const billableMinutes = Math.max(0, session.duration_minutes - 60);
  const additional_hours = billableMinutes ? Math.ceil(billableMinutes / 60) : 0;
  return {
    session_id: session.id,
    plate_number: session.plate_number,
    duration_minutes: session.duration_minutes,
    base_fee: 20,
    included_minutes: 60,
    additional_hourly_fee: 10,
    additional_hours,
    total_fee: 20 + additional_hours * 10,
  };
}

async function mockRequest(path, options = {}) {
  if (path === '/auth/login') {
    const body = JSON.parse(options.body || '{}');
    if (body.username === 'admin' && body.password === 'admin123') {
      return { access_token: 'mock-local-token', token_type: 'bearer' };
    }
    throw new Error('Invalid username or password');
  }

  let items = seedMockSessions();
  const url = new URL(path, 'http://local');

  if (url.pathname === '/dashboard/stats') return mockStats(items);

  if (url.pathname === '/sessions') {
    const plate = url.searchParams.get('plate');
    const status = url.searchParams.get('status');
    let filtered = [...items].sort((a, b) => new Date(b.entry_time) - new Date(a.entry_time));
    if (plate) filtered = filtered.filter((item) => item.plate_number.includes(normalizePlate(plate)));
    if (status) filtered = filtered.filter((item) => item.status === status);
    return { items: filtered, total: filtered.length };
  }

  const sessionMatch = url.pathname.match(/^\/sessions\/(\d+)$/);
  if (sessionMatch) {
    const session = items.find((item) => item.id === Number(sessionMatch[1]));
    if (!session) throw new Error('Session not found');
    return { session, invoice: session.duration_minutes ? mockInvoice(session) : null };
  }

  const paymentMatch = url.pathname.match(/^\/session\/(\d+)\/payment$/);
  if (paymentMatch) {
    const id = Number(paymentMatch[1]);
    items = items.map((item) => (item.id === id ? { ...item, status: 'PAID' } : item));
    saveMockSessions(items);
    return items.find((item) => item.id === id);
  }

  if (url.pathname === '/entry') {
    const plate = normalizePlate(options.body.get('plate_number') || `LOCAL${Date.now().toString().slice(-4)}`);
    const active = items.find((item) => item.plate_number === plate && item.status === 'ACTIVE');
    const session = active || {
      id: Date.now(),
      vehicle_id: Date.now(),
      plate_number: plate,
      entry_time: new Date().toISOString(),
      exit_time: null,
      duration_minutes: null,
      fee_amount: null,
      status: 'ACTIVE',
      entry_image_path: null,
      exit_image_path: null,
      entry_camera_id: 1,
      exit_camera_id: null,
    };
    if (!active) saveMockSessions([session, ...items]);
    return { session, detected_plate: plate, detection_confidence: 1, ocr_confidence: 1, invoice: null };
  }

  if (url.pathname === '/exit') {
    const plate = normalizePlate(options.body.get('plate_number') || '');
    const session = items.find((item) => item.plate_number === plate && item.status === 'ACTIVE');
    if (!session) throw new Error(`No active parking session found for plate ${plate}`);
    const now = new Date();
    session.exit_time = now.toISOString();
    session.duration_minutes = Math.max(1, Math.floor((now - new Date(session.entry_time)) / 60000));
    session.fee_amount = mockInvoice(session).total_fee;
    session.status = 'UNPAID';
    session.exit_camera_id = 2;
    saveMockSessions(items);
    return { session, detected_plate: plate, detection_confidence: 1, ocr_confidence: 1, invoice: mockInvoice(session) };
  }

  throw new Error('Backend is offline and no local fallback exists for this action');
}

export const api = {
  login: (username, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  stats: () => request('/dashboard/stats'),
  sessions: (params = {}) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));
    return request(`/sessions?${query}`);
  },
  session: (id) => request(`/sessions/${id}`),
  entry: (payload) => request('/entry', { method: 'POST', body: payload }),
  exit: (payload) => request('/exit', { method: 'POST', body: payload }),
  updatePayment: (id, paid) => request(`/session/${id}/payment`, { method: 'PUT', body: JSON.stringify({ paid }) }),
};

export { API_BASE_URL };
