# REFERENCE.md

> **TARGET AUDIENCE:** Core Debuggers, Physicists, and UI Integrators.
> **PURPOSE:** A granular dictionary documenting internal routing logic, context bindings, and the Antigravity mathematical formulas guiding the Dashboard component matrix.

---

## 1. Global State Dictionary

| Variable Name | Location                 | Expected Type    | Purpose                                                                                                                                     |
| ------------- | ------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`   | `useDashboardNavigation` | `String`         | Core router trigger. Matches enum strings (`'dashboard'`, `'live'`, `'materials'`). Controls exactly what the `DashboardShell` will render. |
| `userData`    | `useSenseiProfile`       | `Object \| null` | Represents the real-time Firebase user aggregate block piped upward from the underlying network listener.                                   |
| `isZenMode`   | `TopNav` / Context       | `Boolean`        | Dictates local application of dark mode `bg-slate-900` vs flat light aesthetics across Layers 1 & 2.                                        |

---

## 2. Hook API & Method Maps

### `useDashboardNavigation.js`

| Function  | Parameters       | Side Effects   | Logic Flow                                                                                                                               |
| --------- | ---------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `setTab`  | `tabId (String)` | State Mutation | Binds to root React state forcing `<AnimatePresence>` to execute its teardown unmount and subsequent bootup of the new layout component. |
| `prevTab` | `none`           | Path Traversal | Executes stack pop moving user back sequentially over their browser history mimicking application depth navigation.                      |

### `useSenseiProfile.js`

| Lifecycle Block | Dependencies  | Observer Action & Memory Safety                                                                                                                                                                                                                                                  |
| --------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useEffect`     | `[]` On-mount | Triggers Firebase `onAuthStateChanged()`. Extracts `user` and updates local context. Critically, **returns the `unsubscribe()` function** during component teardown to absolutely guarantee ghost-listeners do not stack up and throttle JS heap limits during rigorous routing. |

---

## 3. Animation Physics & The Math of "Antigravity"

Our floating environment feels incredibly natural because it adheres to hard mathematics, specifically smoothing equations ensuring background components track user interaction with weight and momentum rather than raw 1:1 snapping.

### Sub-Module: `FloatingKanji.jsx`

The Kanji canvas utilizes core Linear Interpolation (**Lerp**) to compute its spatial relationship dynamically against mouse vectors.

The mathematical engine driving positional shifts per frame is:

$$Position_{next} = Position_{current} + (Target - Position_{current}) \times 0.1$$

**Where:**

- **$Position_{next}$**: The computed output coordinate on screen.
- **$Position_{current}$**: Where the Kanji currently exists.
- **$Target$**: Where the user's cursor physically is.
- **$0.1$**: The mass/drag friction coefficient (10%). Lower numbers make the element feel heavier and slower.

This specific calculation guarantees the text drifts lazily toward the user rather than jarring their visual field, preventing fatigue during heavy operations within the layout container.
