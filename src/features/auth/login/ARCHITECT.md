# ARCHITECT.md

> **TARGET AUDIENCE:** Security Engineers, API Handlers, and Build Agents.
> **FOCUS:** Authorization pipelines, pure component theory, and layering.

---

## 🏛️ Directory Structure
```text
/login
  ├── /components     # Atomic UI (LoginForm, SocialAuth, AuthBackground)
  ├── /hooks          # The bridge (useLoginLogic)
  ├── /services       # Firebase abstractions (authService)
  └── Login.jsx       # The Gateway Orchestrator
```

## 🧠 The Auth Handshake (Logic Flow)
Component logic is strictly forbidden from executing SDK code. The "Auth Handshake" enforces a strict one-way operational pattern:

1. **User Interface (`LoginForm.jsx`)**: Captures keystrokes and button events.
2. **Bridge Hook (`useLoginLogic.js`)**: Executes localized validation (e.g., checks if email exists), manages loading/error states, and calls the service.
3. **API Service (`authService.js`)**: Abstractly maps to Firebase (`signInWithEmailAndPassword`), completely ignorant of the React DOM.
4. **Firebase Pipeline**: Resolves the handshake.
5. **Dashboard Transition**: The global observer pattern kicks in, transitioning the application layout to the authenticated workspace.

## ⚠️ The Antigravity Layout (Layering Constraints)

The Gateway enforces an absolute Z-index rule:
- **`z-0` (Canvas Engine):** The WebGL 3D Event Horizon. Must never occlude the DOM.
- **`z-10` (Login Card Orchestrator):** The glass pane. Ensures all pointer events are captured cleanly without registering on the background canvas.
