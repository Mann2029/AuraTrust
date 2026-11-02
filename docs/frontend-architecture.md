# AuraTrust Sentinel — Frontend Architecture & UI/UX Specification

## 1. Component Hierarchy & Modular Structure

```text
frontend/src/
├── main.jsx                  # React 19 root DOM renderer
├── App.jsx                   # Global portal coordinator & state provider
├── index.css                 # Tailwind directives, CSS variables, keyframes
├── components/
│   ├── Navbar.jsx            # Brand header, role badge, WS status, portal tabs
│   ├── LandingPage.jsx       # 3D interactive hero, auth modal, architectural pillars
│   ├── FacultyDashboard.jsx  # Live staging table, dual-verification queue, ledger commit
│   ├── CameraScanner.jsx     # Edge webcam capture, holographic reticle, live pipeline feedback
│   ├── StudentHub.jsx        # Compliance metrics, attendance percentage, XAI Copilot
│   ├── ReportHub.jsx         # Hardware telemetry, defaulters register, CSV exporter
│   └── 3d/
│       └── SentinelScene.jsx # Three.js WebGL canvas, GLTFLoader, performance controller
└── services/
    ├── api.js                # Full-stack HTTP client (JWT + cookie auth, error handling)
    └── websocket.js          # Resilient WebSocket client (backoff, channel multiplexing)
```

---

## 2. State Management & Real-Time Synchronization

- **Local Storage Authentication**: Token (`auratrust_token`) and user profile (`auratrust_user`) are persisted in browser storage and injected into HTTP request headers via `services/api.js`.
- **Reactive WebSocket Hub**:
  - `SentinelWebSocketClient` initializes on application mount.
  - Channels (e.g. `session_1`) are subscribed dynamically when the user navigates into active sessions.
  - Automatic reconnection with exponential backoff ($delay = \min(1000 \times 1.5^n, 10000)$) prevents connection storms during server restarts.
  - Heartbeat ping keepalive every 25 seconds prevents proxy timeout disconnections.

---

## 3. Bundle Analysis & Performance Budget

```text
Build Artifacts (Vite v8.3.0 + Rolldown):
dist/index.html                   0.47 kB │ gzip:   0.30 kB
dist/assets/index-C9sMPNGF.css   26.90 kB │ gzip:   6.03 kB
dist/assets/index-Dqnj8HBJ.js   928.50 kB │ gzip: 246.87 kB (Includes Three.js 0.186.0 Engine)
dist/models/sentinel_shield.glb  13.87 kB │ binary GLTF 2.0 asset
```

- **CSS Size**: 26.90 kB uncompressed (6.03 kB gzipped).
- **JavaScript Core**: 928 kB uncompressed (246.87 kB gzipped) — fully bundled with Three.js 3D WebGL runtime, Lucide icon set, and reactive UI components.
- **CDN Elimination**: All libraries are locally bundled with pinned versions in `package.json`. No external unpinned CDN scripts are loaded at runtime.

---

## 4. Accessibility (a11y) & WCAG AA Compliance

1. **Reduced Motion Respect**:
   - `window.matchMedia('(prefers-reduced-motion: reduce)')` is actively queried on mount in `SentinelScene.jsx`.
   - If reduced motion is requested, Three.js auto-rotation is disabled immediately, and CSS animations are clamped to zero duration.
2. **Screen Reader Semantic Support**:
   - ARIA live regions (`aria-live="polite"`) announce verification transitions (`IDLE`, `VERIFYING`, `APPROVED`, `FLAGGED`, `DENIED`).
   - All interactive controls feature descriptive `aria-label` attributes.
3. **Keyboard Operability**:
   - 3D viewport and control buttons are focusable and operable via standard keyboard events (`Tab`, `Enter`, `Space`).
