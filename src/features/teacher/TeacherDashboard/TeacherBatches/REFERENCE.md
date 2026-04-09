# REFERENCE.md

> **TARGET AUDIENCE:** Core Debuggers and Logic Refactor Agents.
> **PURPOSE:** Detailed Granular Dictionary charting States, Hooks, and Helper Functions within the `/TeacherBatches` Module.

---

## 1. Registry: State Vectors

These core states govern the complex logic flows embedded within `TeacherBatches.jsx`.

| Variable Name | Type | Origin | Purpose |
|---------------|------|--------|---------|
| `newBatch` | `Object` | `useState` | Central Aggregator for the entire wizard flow. Accumulates string properties (`title`, `level`) and structural configurations before shipping the final payload to `/batches`. |
| `selectedTeachers` | `Array<String>` | `useState` | Real-time staging array mapping specific `UIDs` to be injected into `newBatch.teacherIds` upon total form completion. |
| `pendingSentInvites`| `Array<Object>`| `useState` / `hook` | A direct snapshot reflection tracking live objects within `collabRequests`. Renders UI to show the Lead Teacher that an invite is active but unresolved. |

---

## 2. Dictionary: Functions & Methods

Granular definitions of mutation scripts triggering DB interactions.

| Function Name | Parameters | Side Effects / Triggers | Logic Flow Breakdown |
|---------------|------------|-------------------------|----------------------|
| `handleRemoveCollaborator` | `targetUID` (String) | Firestore `runTransaction` | 1. Initializes active Transaction block. <br> 2. Asserts targetUID is present. <br> 3. Reads `collabRequests` checking active ties. <br> 4. Executes bulk remove on array. <br> 5. Writes target drop to DB safely avoiding ghost references. |
| `onCancelInvite` | `inviteeUID` (String) | Firebase `deleteDoc` | 1. Maps specifically to unresolved requests. <br> 2. Queries absolute document id within `collabRequests` matching the provided `inviteeUID` relative to active `batchId`. <br> 3. Flushes document physically from Firebase preventing ghost invites from hanging inside the recipient's UI. |
| `registerCoupon` | `couponObj` (Object) | State Mutation | 1. Takes constructed object `{ code (String), discount (Int), maxUses (Int) }`. <br> 2. Validates against duplicate code strings inside `newBatch.coupons`. <br> 3. Spreads previous array inserting the new aggregate. |

---

## 3. Reference: Prop Mapping & Component Integrity

To strictly avoid "Invalid Hook Call" or "Undefined Function" pipeline executions, properties traversing from `TeacherBatches.jsx` (Orchestrator) to pure components (e.g., `StepOne.jsx`) must be precisely wired.

### `StepOne.jsx` 
*(General Configuration)*

| Prop Target | Expected Type | Origin Reference | Purpose Mapping |
|-------------|---------------|------------------|-----------------|
| `batchData` | `Object` | `newBatch` | Direct injection of current title, level schemas. |
| `updateData`| `Function` | Wrapper modifier tied to `setNewBatch` | Pure component fires `updateData({ title: 'New Target' })` maintaining pure atomicity safely. |
| `isDarkMode`| `Boolean` | Top-level Context | Controls standard styling outputs. |

### `StepTwo.jsx` 
*(Economics & Coupons)*

| Prop Target | Expected Type | Origin Reference | Purpose Mapping |
|-------------|---------------|------------------|-----------------|
| `batchData` | `Object` | `newBatch` | Accesses `isPremium`, numerical `price`, and `coupons` array. |
| `updateData`| `Function` | Derived `setNewBatch` handler | Modifies the boolean gates defining tiering structures. |
| `addCoupon` | `Function` | Maps to `registerCoupon` | Allows child UI to spawn localized popups returning absolute `couponObj` results upward. |
