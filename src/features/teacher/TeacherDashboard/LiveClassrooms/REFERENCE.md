# REFERENCE.md

> **TARGET AUDIENCE:** Core Systems, AI Agents, and Technical Integrators.
> **PURPOSE:** A low-level technical reference documenting every state, prop, function, object, and hook dependency inside the `/LiveClassrooms` module.

---

## 1. State & Props Registry

### `LiveClassrooms.jsx` (Orchestrator)
| Variable Name | Type | Origin | Purpose |
|---------------|------|--------|---------|
| `isDarkMode` | `Boolean` | Component Prop | Controls global dark/light theme switching for the Orchestrator Layout. |
| `navigate` | `Function` | `useNavigate` hook | Handles React Router route shifting when joining rooms. |
| `liveSessions` | `Array<Object>` | `useClassroomSession` | Plucked from state hook. Feeds the entire Grid layout. Re-renders grid when classes go live/end. |
| `myBatches` | `Array<String>` | `useClassroomSession` | Plucked from state hook. Array of batch access levels allowing co-host capability. |
| `currentUser` | `Object \| null` | `useClassroomSession` | Used to calculate `isHost` by comparing `uid` against `hostId`. |
| `isLoading` | `Boolean` | `useClassroomSession` | Conditionally fires the Syncing Network pre-loader screen. |
| `selectedClassForAuth` | `Object \| null` | `useState` | Determines if the `PasswordModal` should be open and injects target class data inside. |
| `enteredPassword` | `String` | `useState` | Two-way binds the `<input>` element inside the `PasswordModal`. |
| `passwordError` | `String` | `useState` | Captures feedback strings (e.g., "Incorrect access key") if auth validation fails. |

### `hooks/useClassroomSession.js`
| Variable Name | Type | Origin | Purpose |
|---------------|------|--------|---------|
| `liveSessions` | `Array<Object>` | `useState` | Manages the reactive array of documents fetched from the Firebase snapshot. |
| `myBatches` | `Array<String>` | `useState` | Captures the active batches for the current teacher (for co-host evaluations). |
| `currentUser` | `Object \| null` | `useState` | Bound directly to standard Firebase `onAuthStateChanged`. |
| `isLoading` | `Boolean` | `useState` | Begins `true`. Switches to `false` when the first `liveSessions` snapshot completes. |

### `components/ClassroomGrid.jsx`
| Variable Name | Type | Origin | Purpose |
|---------------|------|--------|---------|
| `liveSessions` | `Array<Object>` | Component Prop | Passed down to generate `<ClassroomCard>` instances. |
| `myBatches` | `Array<String>` | Component Prop | Passed to logic computing the `isBatchTeacher` derived boolean. |
| `currentUser` | `Object` | Component Prop | Passed to logic computing the `isHost` derived boolean. |
| `isDarkMode` | `Boolean` | Component Prop | Drives theme of Empty State and child Cards. |
| `onJoinClick` | `Function` | Component Prop | Bubble-up handler executing `handleJoinClick` on the Orchestrator. |
| `onEndSession` | `Function` | Component Prop | Bubble-up handler executing `handleEndSession` on the Orchestrator. |

### `components/ClassroomCard.jsx`
| Variable Name | Type | Origin | Purpose |
|---------------|------|--------|---------|
| `cls` | `Object` | Component Prop | The singular Classroom document. Populates Titles, Count, and Avatar. |
| `index` | `Number` | Component Prop | Governs the staggered `motion.div` delay timing. |
| `isDarkMode` | `Boolean` | Component Prop | Drives CSS classes for hover states, blurs, and borders on the card. |
| `isHost` | `Boolean` | Component Prop | Evaluated in parent. Renders "Your Class" Crown badge and allows "Resume" and "X" buttons. |
| `isBatchTeacher` | `Boolean` | Component Prop | Evaluated in parent. Renders "Co-Host" Shield badge and allows direct co-host joining. |
| `requiresPassword`| `Boolean` | Component Prop | Evaluated in parent. Triggers the Lock badge and directs click handler to trigger the Modal. |
| `onJoinClick` | `Function` | Component Prop | Attached to the primary CTA button. |
| `onEndSession` | `Function` | Component Prop | Attached to the red "X" (End Session) terminate button. |

### `components/ClassroomHeader.jsx`
| Variable Name | Type | Origin | Purpose |
|---------------|------|--------|---------|
| `liveSessionsCount`| `Number` | Component Prop | Displays the numerical count inside the LIVE SESSIONS pill. |
| `isDarkMode` | `Boolean` | Component Prop | Stylistic toggle for the floating header badges. |

### `components/PasswordModal.jsx`
| Variable Name | Type | Origin | Purpose |
|---------------|------|--------|---------|
| `isOpen` | `Boolean` | Component Prop | Directly mapped to `!!selectedClassForAuth` driving `<AnimatePresence>`. |
| `onClose` | `Function` | Component Prop | Clears `selectedClassForAuth` state, triggering `exit` animations. |
| `selectedClass` | `Object` | Component Prop | Pulls the Sensei’s name out for the restricted text context. |
| `enteredPassword` | `String` | Component Prop | Value bounded `<input>` property. |
| `setEnteredPassword`| `Function`| Component Prop | Event handler managing the keystrokes updating Orchestrator state. |
| `passwordError` | `String` | Component Prop | Conditionally triggers the red `ShieldAlert` notification if populated. |
| `onSubmit` | `Function` | Component Prop | Bound to the `<form onSubmit="...">`. |
| `isDarkMode` | `Boolean` | Component Prop | Toggles the internal Modal styling themes. |

---

## 2. Function & Method Dictionary

### `LiveClassrooms.jsx` (Orchestrator)
#### `handleEndSession`
- **Parameters:** `classId` (`String`)
- **Side Effects:** Prompts `window.confirm`. If confirmed, calls API modifying Firebase.
- **Logic Flow:**
  1. Spawns browser generic confirm alert regarding irrevocable termination.
  2. Awaits `endClassroomSession(classId)` Promise.
  3. Returns silent error catch if failed (preventing application crash).

#### `handleJoinClick`
- **Parameters:** `cls` (`Object`), `isHost` (`Boolean`), `isBatchTeacher` (`Boolean`)
- **Side Effects:** Modifies URL via `navigate()` or toggles Component State `selectedClassForAuth`.
- **Logic Flow:**
  1. Checks `if (isHost)`, navigates to `/room/[roomID]?type=...&role=teacher`.
  2. Checks `else if (isBatchTeacher)`, navigates to `/room/[roomID]...&role=co-host`.
  3. Checks `else if (cls.password)`, sets `selectedClassForAuth` -> clears `enteredPassword` -> clears `passwordError`. (Mounts Modal).
  4. `else` routes directly as `&role=guest`.

#### `handlePasswordSubmit`
- **Parameters:** `e` (`Event`)
- **Side Effects:** Prevents default form refresh. Appends browser history OR drops error text.
- **Logic Flow:**
  1. Triggers `e.preventDefault()`.
  2. Strictly matches `enteredPassword === selectedClassForAuth.password`.
  3. On success: Navigates to room as guest and resets state `setTargetAuth(null)`.
  4. On fail: Sets strictly-typed string to `setPasswordError` triggering conditional Render node.

### `services/classroomService.js`
#### `endClassroomSession`
- **Parameters:** `classId` (`String`)
- **Side Effects:** Mutates Firestore Document (Over the network).
- **Logic Flow:**
  1. Wraps execution in `try / catch`.
  2. Invokes Firebase `updateDoc` against the explicit reference: `doc(db, "classes", classId)`.
  3. Mutates `status: CLASSROOM_STATUS.ENDED` and `endedAt: serverTimestamp()`.
  4. Logs to `console.error` and inherently throws on fail.

---

## 3. Object & Constant Map

### `constants/classroomConstants.js`
#### `CLASSROOM_STATUS`
- **Structure:** 
  ```javascript
  {
    LIVE: 'live',
    ENDED: 'ended'
  }
  ```
- **Use Case:** Replaces fragile magic strings globally. Sourced heavily inside `useClassroomSession.js` (`where("status", "==", CLASSROOM_STATUS.LIVE)`) and the Service mutations setting it to `ENDED`.

---

## 4. Hook Dependency Tracker

### `useClassroomSession.js`

#### Authentication Configuration
- **Dependencies:** `[]` (On Mount Only).
- **Action:** Triggers `auth.onAuthStateChanged((user) => setCurrentUser(user));`.
- **Cleanup:** Returns `unsubscribe()` memory-cleanup function to prevent lingering observers on dismount.

#### Classes Status Snapshot
- **Dependencies:** `[]` (On Mount Only).
- **Action:** Generates Firestore query strictly matching `CLASSROOM_STATUS.LIVE`. Iterates snapshot documents dynamically calculating `studentCount` relative to `activeParticipants`. Fires `setLiveSessions` followed by `setIsLoading(false)`.
- **Cleanup:** `return () => unsubscribe();`. Removes the Firestore socket connection entirely during dismount.

#### Batch Access Snapshot
- **Dependencies:** `[currentUser]` (Fires on Initialization + Any Auth Shifting).
- **Action:** Immediately returns if `!currentUser` is falsy. Constructs explicit constraint checking if `currentUser.uid` exists within the `teacherIds` array constraint. Maps batch responses exclusively down to their `title` and populates `setMyBatches`.
- **Cleanup:** Executes Firestore snapshot unsubscription allowing the `useEffect` to safely tear down the pipeline if `currentUser` mutates mid-session.
