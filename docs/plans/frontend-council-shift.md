# 🏛️ Council Deliberation: Shift & Day Closing Frontend Migration

## 📜 The Directive
The user wants to migrate the Shift and Day Closing frontend from the legacy Pahuch ERP client to the new neo-modular `erp-frontend`. The new frontend has a completely different UI theme, folder structure (`src/features`, `src/store`, `src/components`), and must hook up to the simplified neo-modular backend endpoints we just built. Crucially, the "Create Sale Bill" page must react to the active shift and derive its bill date from it.

## 👥 The Council Members & Perspectives

### 🏛️ The Architect
- **Stance**: +4
- **Priorities**: The new ERP uses a feature-based folder structure. We should create a new `operations` feature: `src/features/operations/shifts` and `src/features/operations/day-closings`.
- **Key Directive**: All API calls must go through RTK Query (if used) or standard Redux Toolkit slices matching the neo-modular architecture.
- **Concern**: Mixing operations logic inside the Sales feature. Shifts should be globally accessible via state but managed in their own module.

### 🛡️ The Guardian
- **Stance**: +3
- **Priorities**: The `CreateSaleBill` functionality must strictly prevent creating invoices if no shift is open, or it must automatically link the invoice to the open shift's date.
- **Key Directive**: In the Redux store, we need an `activeShift` state that the Sales components can subscribe to.

### 🎨 The UX Specialist
- **Stance**: +5
- **Priorities**: The legacy `CreateShiftDialog`, `CloseShiftDialog`, `AllShifts` grid need to be redesigned using the new ERP's UI component library (MUI, Shadcn, or Tailwind - whichever is used).
- **Key Directive**: Match the styling, modals, and data grids of the new ERP's existing modules (like Sales or Finance).

### 🔨 The Pragmatic Executor
- **Stance**: +5
- **Priorities**: Let's build exactly what's needed.
  1. Redux Slices: `shiftSlice`, `dayClosingSlice`.
  2. Hooks: `useActiveShift()`.
  3. UI Pages: `AllShifts`, `AllDayClosings`.
  4. Modals: `CreateShiftDialog`, `CloseShiftDialog`, `CreateDayClosingDialog`, `CloseDayClosingDialog`.
  5. Interceptor/Integration: Update `CreateInvoice` to pull `billDate` from `useActiveShift()`.

---

## ⚔️ Final Resolution
We will build the feature as `src/features/operations` in the `erp-frontend` workspace.
The plan is structured in `frontend-task.md`.
