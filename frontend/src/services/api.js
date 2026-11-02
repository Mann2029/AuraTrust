/**
 * AuraTrust Sentinel Full-Stack API Client
 * Supports Bearer token authorization header and cookie-based sessions.
 */

const API_BASE = '/api/v1';

function getAuthHeaders(isJson = true) {
  const headers = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  const token = localStorage.getItem('auratrust_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  if (response.status === 401) {
    // Session expired or invalid
    localStorage.removeItem('auratrust_token');
    localStorage.removeItem('auratrust_user');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg = data.detail || response.statusText || 'An unexpected error occurred';
    throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
  }
  return data;
}

export const api = {
  // Auth Endpoints
  async login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    const data = await handleResponse(res);
    if (data.access_token) {
      localStorage.setItem('auratrust_token', data.access_token);
      localStorage.setItem('auratrust_user', JSON.stringify({
        username: data.username,
        role: data.role
      }));
    }
    return data;
  },

  async logout() {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('auratrust_token');
    localStorage.removeItem('auratrust_user');
  },

  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('auratrust_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  getToken() {
    return localStorage.getItem('auratrust_token');
  },

  // System Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  async getMetrics() {
    const res = await fetch('/metrics');
    return res.text();
  },

  // Session Lifecycle
  async getAllSessions() {
    const res = await fetch(`${API_BASE}/sessions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getActiveSessions() {
    const res = await fetch(`${API_BASE}/sessions/active`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getCurrentSession(subjectId = null) {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    const res = await fetch(`${API_BASE}/sessions/current${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createAndStartSession(subjectId = null, roomNumber = 'Hall B-204') {
    const formData = new URLSearchParams();
    if (subjectId) formData.append('subject_id', subjectId);
    if (roomNumber) formData.append('room_number', roomNumber);

    const res = await fetch(`${API_BASE}/sessions/create-and-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...getAuthHeaders(false)
      },
      body: formData.toString()
    });
    return handleResponse(res);
  },

  async changeSessionStatus(sessionId, newStatus) {
    const formData = new URLSearchParams();
    formData.append('new_status', newStatus);

    const res = await fetch(`${API_BASE}/sessions/${sessionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...getAuthHeaders(false)
      },
      body: formData.toString()
    });
    return handleResponse(res);
  },

  async getSession(sessionId) {
    const res = await fetch(`${API_BASE}/session/${sessionId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async activateSession(sessionId) {
    const res = await fetch(`${API_BASE}/session/${sessionId}/activate`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async extendSession(sessionId, minutes = 5) {
    const res = await fetch(`${API_BASE}/session/${sessionId}/extend?minutes=${minutes}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async closeSession(sessionId) {
    const res = await fetch(`${API_BASE}/session/${sessionId}/close`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async startSession(sessionId, file = null) {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    if (file) formData.append('file', file);

    const res = await fetch(`${API_BASE}/session/start`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData
    });
    return handleResponse(res);
  },

  // Biometric Verification Pipeline
  async verifyAttendance(sessionId, file) {
    const formData = new FormData();
    formData.append('session_id', sessionId);
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/attendance/verify`, {
      method: 'POST',
      headers: getAuthHeaders(false),
      body: formData
    });
    return handleResponse(res);
  },

  async getSessionRoster(sessionId) {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/roster`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getStagedAttendance(sessionId) {
    const res = await fetch(`${API_BASE}/attendance/staging/${sessionId}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async approveStagedStudent(sessionId, registrationNo) {
    const res = await fetch(`${API_BASE}/attendance/staging/approve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ session_id: sessionId, registration_no: registrationNo })
    });
    return handleResponse(res);
  },

  async rejectStagedStudent(sessionId, registrationNo) {
    const res = await fetch(`${API_BASE}/attendance/staging/reject?session_id=${sessionId}&registration_no=${encodeURIComponent(registrationNo)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ session_id: sessionId, registration_no: registrationNo })
    });
    return handleResponse(res);
  },

  async commitAttendance(sessionId) {
    const res = await fetch(`${API_BASE}/attendance/commit/${sessionId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Dual-Verification Queue
  async getPendingDualVerifications(sessionId = null) {
    const query = sessionId ? `?session_id=${sessionId}` : '';
    const res = await fetch(`${API_BASE}/dual-verification/pending${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async resolveDualVerification(transactionId, action, remarks = '') {
    const res = await fetch(`${API_BASE}/dual-verification/resolve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        transaction_id: transactionId,
        action: action,
        remarks: remarks
      })
    });
    return handleResponse(res);
  },

  // XAI & Visual Forensics

  async explainRiskScore(dynamicRiskScore, decision, telemetryBreakdown) {
    const res = await fetch(`${API_BASE}/xai/explain-risk`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        dynamic_risk_score: dynamicRiskScore,
        decision,
        telemetry_breakdown: telemetryBreakdown
      })
    });
    return handleResponse(res);
  },

  // Reports & Telemetry
  async getSecuritySummary(limit = 25) {
    const res = await fetch(`${API_BASE}/reports/security-summary?limit=${limit}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getStudentDashboard(regNo = '') {
    const query = regNo ? `?student_reg=${encodeURIComponent(regNo)}` : '';
    const res = await fetch(`${API_BASE}/student/dashboard${query}`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getStudents() {
    const res = await fetch(`${API_BASE}/students`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getDefaulters() {
    const res = await fetch(`${API_BASE}/reports/defaulters`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  getAuditCSVUrl() {
    return `${API_BASE}/reports/audit/csv`;
  },

  async downloadAuditCSV() {
    const res = await fetch(`${API_BASE}/reports/audit/csv`, {
      headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error('Failed to download audit CSV');
    return res.blob();
  }
};
