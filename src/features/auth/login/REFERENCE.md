# REFERENCE.md

> **TARGET AUDIENCE:** AI Co-pilots and Granular Technical Debuggers.
> **PURPOSE:** Detailed documentation of physical transit mappings and active local states.

---

## 1. Gateway State Maps

| Internal Key | Type | Description |
|--------------|------|-------------|
| `isSubmitting` | `Boolean` | Toggles the internal processing logic (spins loaders, disables repeat network dispatch). |
| `authError` | `String` | Translated UI-friendly rejection messages piped from `/types/errors.js`. |
| `userEmail` | `String` | Core bind for the controlled component input payload. |

---

## 2. API Function Dictionary

- **`handleSignIn(email, password)`**
  - Consumes UI payloads and dispatches to the `authService`. Handles asynchronous state toggles.

- **`handleSocialAuth()`**
  - Triggers the invisible OAuth pop-up flow. Upon resolution, inherently triggers the observer bypass without manually assigning the payload.

- **`Email Validation Rules`**
  - Localized Regex checks filter malformed emails (e.g., `@.com` missing suffixes) *before* wasting network requests to Firebase.

---

## 3. Transition Math & Physics

When bridging from the Login Gateway to the Dashboard, the application leverages a specialized Z-depth scaling formula.

### The Z-Axis Warp Engine

To achieve the "dive" effect into the system, we calculate a continuous logarithmic increase in scale interpolation, dragging the viewpoint forward visually while dropping opacity:

$$Transition_{warp} = \text{lerp}(z_{start}, z_{end}, \text{progress}^2)$$

**Variables:**
- **$z_{start}$**: The default resting scale of the login card (`1.0`).
- **$z_{end}$**: The termination scale constraint before completely removing from the DOM (e.g., `5.0`).
- **$progress^2$**: Exponentiating the linear transition time applies an acceleration curve, ensuring the dive starts soft but physically "sucks" the user through the interface at the end of the duration.
