# REFERENCE.md

> **TARGET AUDIENCE:** Granular Maintenance Developers and Mathematical Debuggers.
> **PURPOSE:** Deep-dive interface APIs, Prop expectations, and hard-coded physics logic.

---

## 1. Global State Dictionary

| Internal Key | Type | Description |
|--------------|------|-------------|
| `rawResources` | `Array<Object>` | Complete, unfiltered repository dataset parsed from active DB snapshot block. |
| `filteredItems` | `Array<Object>` | The active subset mutation currently pushed into the browser rendering pipeline. |
| `activeCategory` | `String` | Filter definition (e.g., `'N5'`, `'CHEAT_SHEET'`, `'AUDIO'`). Defaults to `'ALL'`. |

---

## 2. Function Dictionary

### Data Controllers
- **`handleDownload(assetId)`** 
  - **Execute:** Locates the secure signed URL payload for the requested asset.
  - **Mutation:** Triggers network anchor click while simultaneously executing an `updateDoc` dispatch to Firebase, modifying the current user's `lastAccessedResource` and `timestamp` fields.

- **`applyFilters(searchStr, categoryTag)`** 
  - **Execute:** Core filtering logic combining dynamic RegEx parsing for `searchStr` (lowercased substring matches specifically targeting `.title`, `.desc`, and `.kanji_tags` nodes) combined with strict boolean validation for the `categoryTag`.

---

## 3. Component Prop Interface

### `<ResourceCard />`
Critical atomic component. Failure to provide exact prop structures will result in runtime render crashes.

| Prop | Type | Requirement | Data Purpose |
|------|------|-------------|--------------|
| `asset` | `Object` | Required | Standard object defining { id, title, type (e.g. 'PDF', 'AUDIO'), desc, size, fileUrl } |
| `isDarkMode` | `Boolean` | Required | Informs internal ternary logic to inject specific tailwind `bg-slate-900` values or flat `bg-white` definitions. |
| `setViewingPdf` | `Function` | Optional | State setter callback for initializing the floating protected DOM portal containing the Secure Reader overlay. |

---

## 4. Math / Physics Constraint

To achieve the "zero-gravity" suspension illusion on user `:hover` inside the `ResourceCard`, we discard standard CSS timing functions (`ease-in-out`) in favor of algorithmic spring-based friction dynamics.

Any future UI card additions **must** implement the following numerical physics map:

$$stiffness: 300, damping: 20, mass: 0.8$$

- **Stiffness (300):** Defines the tension strength of the hover spring. High values ensure a sharp, responsive snap toward the mouse vector.
- **Damping (20):** Overcomes endless jittering. Kills the momentum so the card sits firmly at the peak of the hover cycle.
- **Mass (0.8):** Artificially lowers the weight of the HTML block compared to the `1.0` default, creating the distinct "float" or "paper-thin" aesthetic when expanding.
