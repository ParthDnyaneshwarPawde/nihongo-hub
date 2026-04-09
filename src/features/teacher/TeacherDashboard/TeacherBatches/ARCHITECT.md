# ARCHITECT.md

> **TARGET AUDIENCE:** Future AI Agents, System Maintainers, and Build Bots.
> **FOCUS:** Strict constraints, transactional lifecycles, schemas, and Logic Flows.

---

## 🏛️ Module Anatomy
The TeacherBatches module implements a multi-step orchestration wizard. Strict decoupling of smart-logic and dumb-UI must be maintained.

```text
/TeacherBatches
  ├── /components    
  │    ├── StepOne.jsx      # (Pure UI) General Batch Details (Title, Description, Level)
  │    ├── StepTwo.jsx      # (Pure UI) Pricing & Coupon Configurations
  │    └── StepThree.jsx    # (Pure UI) The Collaborator Registry mapping
  ├── /hooks         
  │    └── useBatchOrchestrator.js # Real-time queries for existing invites and validations
  ├── /services      
  │    └── batchTransactions.js    # runTransaction logic for DB safety
  └── TeacherBatches.jsx    # The Smart Parent Orchestrator and Wizard Controller
```

## 🗃️ Firebase Schema 

### `batches` Collection
Must accurately contain array structures mapping multiple host authorities.
```typescript
interface BatchDoc {
  id: string; // Document ID
  title: string;
  level: string; // e.g. "N5", "N1"
  isPremium: boolean;
  price?: number; 
  teacherIds: string[]; // [LeadTeacher_UID, Collab_UID_1, ...]
  coupons: CouponDoc[];
}

interface CouponDoc {
  code: string;       // Unique string literal e.g., 'SAVE20'
  discount: number;   // Percentage subtraction
  maxUses: number;
}
```

### `collabRequests` Collection
A bridging table managing pending handshake agreements.
```typescript
interface CollabRequest {
  id: string; 
  batchId: string;
  inviterUID: string;
  inviteeUID: string;
  status: 'pending' | 'accepted' | 'declined';
}
```

## ⚠️ The Antigravity Rules (CRITICAL CONSTRAINTS)

You **must** comply with these architectural edicts for consistency:

1. **Atomic State Propagation:** State mutations and reactive logic logic **must** live strictly in `TeacherBatches.jsx` (the Parent) or within `/hooks`. The step components (`StepOne.jsx`, `StepTwo.jsx`) are **Pure UI Modules** reliant strictly on injected props.
2. **Transaction Safety Measures:** Direct `deleteDoc` or standard `updateDoc` array-removals are forbidden. Deleting an entire batch, or modifying heavily-read data like removing a Collaborator, **MUST** execute via Firestore `runTransaction` to prevent cascading failures across the User base.
3. **Animation Standards:** All UI layers must reflect the "Glassmorphism" standard by enforcing `backdrop-blur-xl`. All `framer-motion` properties must utilize the overarching physics standard: `transition={{ type: 'spring', stiffness: 300, damping: 25, mass: 0.5 }}`.

## 🔄 Batch-to-Collaborator Lifecycle

```mermaid
erDiagram
    LEAD-TEACHER ||--o{ BATCH : ""creates""
    BATCH ||--o{ COLLAB_REQUEST : ""initiates""
    COLLAB_REQUEST }o--|| INVITEE : ""targets""
    INVITEE ||--o{ BATCH : ""joins via accept""
```
