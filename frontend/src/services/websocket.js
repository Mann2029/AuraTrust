/**
 * AuraTrust Sentinel Resilient Real-Time WebSocket Client
 * Features:
 * - Exponential backoff auto-reconnection
 * - Token authentication via query parameter
 * - Channel subscription multiplexing (e.g. session_1)
 * - Heartbeat ping/pong keepalive
 */

export class SentinelWebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 10000;
    this.baseReconnectDelay = 1000;
    this.listeners = new Set();
    this.channels = new Set(['global']);
    this.sessionId = 1;
    this.pingInterval = null;
    this.isConnected = false;
    this.isExplicitlyClosed = false;
  }

  connect(sessionId = this.sessionId) {
    this.sessionId = sessionId;
    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const token = localStorage.getItem('auratrust_token') || '';
    
    // In dev mode when running vite on 5173, point to port 8000 if needed
    const wsHost = window.location.port === '5173' ? `${window.location.hostname}:8000` : host;
    const url = `${protocol}//${wsHost}/api/v1/ws/session/${encodeURIComponent(this.sessionId)}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._notifyStatus(true);
        this._startHeartbeat();
        // Re-subscribe to all active channels including sessions_global
        for (const ch of this.channels) {
          try {
            this.ws.send(JSON.stringify({ action: 'subscribe', channel: ch }));
          } catch {
            // Socket send error fallback
          }
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          for (const listener of this.listeners) {
            listener(data);
          }
        } catch (err) {
          console.warn('[WS] Failed to parse message JSON:', event.data);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this._stopHeartbeat();
        this._notifyStatus(false);
        if (!this.isExplicitlyClosed) {
          this._scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.warn('[WS] Error encountered:', error);
      };
    } catch (err) {
      this._scheduleReconnect();
    }
  }

  switchSession(newSessionId) {
    if (this.sessionId && this.sessionId !== newSessionId) {
      this.unsubscribe(`session_${this.sessionId}`);
    }
    this.sessionId = newSessionId;
    this.subscribe(`session_${newSessionId}`);
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    this._stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this._notifyStatus(false);
  }

  subscribe(channel) {
    this.channels.add(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        channel: channel
      }));
    }
  }

  unsubscribe(channel) {
    this.channels.delete(channel);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        channel: channel
      }));
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ action: 'ping', timestamp: Date.now() }));
      }
    }, 25000);
  }

  _stopHeartbeat() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  _scheduleReconnect() {
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;
    setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect(this.sessionId);
      }
    }, delay);
  }

  _notifyStatus(status) {
    for (const listener of this.listeners) {
      listener({ event: 'WS_CONNECTION_STATE', connected: status });
    }
  }
}

export const wsClient = new SentinelWebSocketClient();
