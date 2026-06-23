/* ─────────────────────────────────────────────────────────────
   app.js  –  Shared utilities: Auth, API, Toast, Nav
   ───────────────────────────────────────────────────────────── */

// Use relative URL — works since Express serves both API and frontend
const API = '/api';

// ── Auth helpers ──────────────────────────────────────────────────
const Auth = {
  getToken() { return localStorage.getItem('mm_token'); },
  getUser()  { try { return JSON.parse(localStorage.getItem('mm_user')); } catch { return null; } },
  setSession(token, user) {
    localStorage.setItem('mm_token', token);
    localStorage.setItem('mm_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('mm_token');
    localStorage.removeItem('mm_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login.html';
      return false;
    }
    return true;
  },
  logout() {
    this.clearSession();
    window.location.href = '/login.html';
  }
};

// ── API fetch wrapper ─────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    Auth.logout();
    throw new Error('Session expired');
  }
  if (!res.ok) {
    const err = new Error(data.message || 'Request failed');
    // Attach any extra fields from the response (e.g. email, needsVerification)
    Object.assign(err, data);
    throw err;
  }
  return data;
}

// ── Transaction API ───────────────────────────────────────────────
const TransactionAPI = {
  getAll(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/transactions${qs ? '?' + qs : ''}`);
  },
  getSummary(filter) {
    return apiFetch(`/transactions/summary${filter ? '?filter=' + filter : ''}`);
  },
  getCategoryBreakdown(filter) {
    return apiFetch(`/transactions/category-breakdown${filter ? '?filter=' + filter : ''}`);
  },
  getMonthlyTrend() {
    return apiFetch('/transactions/monthly-trend');
  },
  create(data) {
    return apiFetch('/transactions', { method: 'POST', body: JSON.stringify(data) });
  },
  update(id, data) {
    return apiFetch(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },
  delete(id) {
    return apiFetch(`/transactions/${id}`, { method: 'DELETE' });
  }
};

// ── Auth API ──────────────────────────────────────────────────────
const AuthAPI = {
  register(data) {
    return apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  },
  login(data) {
    return apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) });
  },
  verifyOtp(data) {
    return apiFetch('/auth/verify-otp', { method: 'POST', body: JSON.stringify(data) });
  },
  resendOtp(data) {
    return apiFetch('/auth/resend-otp', { method: 'POST', body: JSON.stringify(data) });
  }
};

// ── Toast Notifications ────────────────────────────────────────────
const Toast = {
  container: null,
  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'toast-container';
    document.body.appendChild(this.container);
  },
  show(message, type = 'success', duration = 3500) {
    this.init();
    const icons = { success: 'ri-checkbox-circle-fill', error: 'ri-error-warning-fill', info: 'ri-information-fill' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="toast-icon ${icons[type] || icons.info}"></i>
      <span class="toast-text">${message}</span>
    `;
    this.container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg)   { this.show(msg, 'error'); },
  info(msg)    { this.show(msg, 'info'); }
};

// ── Nav render ────────────────────────────────────────────────────
function renderNav(activePage) {
  const user = Auth.getUser();
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?';

  const navHTML = `
    <div class="bg-orbs"></div>
    <nav class="navbar">
      <div class="nav-brand">
        <div class="brand-icon">💰</div>
        <span>Money Manager</span>
      </div>
      <ul class="nav-links">
        <li><a href="/dashboard.html" class="nav-link ${activePage === 'dashboard' ? 'active' : ''}">
          <i class="ri-dashboard-3-line"></i> Dashboard
        </a></li>
        <li><a href="/index.html" class="nav-link ${activePage === 'transactions' ? 'active' : ''}">
          <i class="ri-exchange-dollar-line"></i> Transactions
        </a></li>
        <li><a href="/charts.html" class="nav-link ${activePage === 'charts' ? 'active' : ''}">
          <i class="ri-bar-chart-grouped-line"></i> Charts
        </a></li>
      </ul>
      <div class="nav-right">
        <div class="nav-user">
          <div class="nav-avatar">${initials}</div>
          <span class="nav-username">${user ? user.name : ''}</span>
        </div>
        <button class="btn-logout" onclick="Auth.logout()">
          <i class="ri-logout-box-r-line"></i> Logout
        </button>
      </div>
    </nav>
  `;
  document.body.insertAdjacentHTML('afterbegin', navHTML);
}

// ── Currency formatter ────────────────────────────────────────────
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

// ── Date formatter ────────────────────────────────────────────────
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Category icon map ─────────────────────────────────────────────
const CATEGORY_ICONS = {
  'Refund': 'ri-refund-2-line',
  'Salary': 'ri-briefcase-line',
  'Stock': 'ri-stock-line',
  'Freelance': 'ri-macbook-line',
  'Business': 'ri-store-2-line',
  'Investment': 'ri-stock-line',
  'Gift': 'ri-gift-line',
  'Other Income': 'ri-add-circle-line',
  'Food & Dining': 'ri-restaurant-line',
  'Transport': 'ri-car-line',
  'Shopping': 'ri-shopping-bag-line',
  'Entertainment': 'ri-film-line',
  'Rent': 'ri-home-4-line',
  'Health': 'ri-heart-pulse-line',
  'Education': 'ri-book-open-line',
  'Utilities': 'ri-flashlight-line',
  'Travel': 'ri-plane-line',
  'Other': 'ri-more-line'
};

function getCategoryIcon(category) {
  return CATEGORY_ICONS[category] || 'ri-price-tag-3-line';
}

const INCOME_CATEGORIES = ['Salary', 'Stock', 'Freelance', 'Business', 'Investment', 'Gift', 'Other Income'];
const EXPENSE_CATEGORIES = ['Food & Dining', 'Transport', 'Shopping', 'Entertainment', 'Rent', 'Health', 'Education', 'Utilities', 'Travel', 'Other'];
const REFUND_CATEGORIES = ['Transport', 'Shopping', 'Ticket Bookings', 'Utilities'];

function getCategoriesForType(type) {
  return type != 'refund' ? (type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES):REFUND_CATEGORIES;
}
