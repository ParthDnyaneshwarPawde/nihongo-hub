# 📖 Reference Guide: Student Dashboard

**Target Audience:** Granular Debugging & Scaling Systems

## 📦 Global State Registry

| State Variable      | Data Type | Description                                                                         |
| :------------------ | :-------: | :---------------------------------------------------------------------------------- |
| `activeTab`         | `String`  | Current view state for the dashboard mounted in Layer 1.                            |
| `studentProgress`   | `Object`  | Real-time payload tracking JLPT level, total XP, and streak velocity.               |
| `isSidebarExpanded` | `Boolean` | Controls the magnetic sidebar width. Collapses organically on small/medium screens. |

## 🪝 Hook API Dictionary

### `useStudentNavigation()`

Abstracts all layout toggles and internal route controls.

- **`handleTabClick(tabId)`**: Fires the `<AnimatePresence>` shift, swapping the Content Stage to a new module while closing the floating UI overlays natively.
- **`tabTransition` / Controller Maps**: Manages mapping from string identifiers (`"learn"`, `"vault"`, etc.) directly to their respective high-order components.

### `useStudentProgress()` (Session)

Maintains synchronous connection to the database.

- **Responsibilities**: Attaches pure Firestore listeners (`onSnapshot`) linking the student's local component states directly with the specific document mapped in the `users` collection.
- **Fail-safes**: Manages course ownership boundaries (if a student requests a premium JLPT level they haven't bought, the bouncer catches and routes them to free content).

## 🪐 Animation Physics

We mandate realistic kinetic boundaries for visual elements. Adhere exclusively to the equations below when applying physics to the Zen-Focus background elements.

### The "Student Focus" Drift Math

The drifting logic for ambient Kanji and layout particles must be handled with smooth sin-wave translations to prevent jarring frame-updates.

$$Position_{next} = Position_{current} + \sin(time \times frequency) \times amplitude$$

### Standard Spring Configuration

For any physics-based buttons or `<motion.div>` popups, utilize the following uniform spring properties to secure our immersive "magnetic" user feel:

```javascript
const magneticSpring = {
  type: "spring",
  stiffness: 250,
  damping: 25,
};
```
