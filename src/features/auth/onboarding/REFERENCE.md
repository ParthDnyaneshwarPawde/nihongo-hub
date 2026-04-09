# REFERENCE.md

> **TARGET AUDIENCE:** Component Integrators and Core System Architects.
> **PURPOSE:** Hard-data dictionaries tracking hook properties, functions, and the required physical constraints.

---

## 1. Local State Registry

| Internal Key | Type | Description |
|--------------|------|-------------|
| `onboardingData` | `Object` | The core payload map. Specifically tracks schema identifiers like `name`, `bio`, `role`, and `interests`. |
| `stepIndex` | `Integer` | The strict state machine integer dictating the active pipeline frame (defaults to `1`). |

---

## 2. API Function Dictionary

- **`nextStep()`**
  - Increments `stepIndex`. Heavily embedded with local string validation (halts integer change if required schema fields are missing in the current frame).
- **`prevStep()`**
  - Deflates `stepIndex` safely with a strict `Math.max(1)` lower bound lock.
- **`handleFinalSubmission()`**
  - The final dispatch node. Converts the localized `onboardingData` into a Firestone document layout map and initiates the async network push.

---

## 3. Communication Bridge (Props Map)

To effectively orchestrate the independent step files without Context APIs, the parent utilizes explicit prop drops:

- **`formData`:** Pipes the localized `onboardingData` mirror *down* to the component to auto-fill fields if a user selects `prevStep()`.
- **`handleChange`:** Exposes the mutation ability *upward* to the hook so atomic components can actively type strings into the master cache.

---

## 4. Mathematics of Ascension

To ensure global visual consistency with the Gateway, the transitions during role selection and progression leverage the exact same "Z-Axis Warp" acceleration matrix explicitly modeled via LaTeX constraints:

$$Transition_{warp} = \text{lerp}(z_{start}, z_{end}, \text{progress}^2)$$

Implementations within Framer Motion should natively map this by utilizing `duration` maps assigned alongside quadratic easing blocks (`easeIn` equivalent for $progress^2$) whenever mounting/unmounting core views during the Ascension pipeline.
