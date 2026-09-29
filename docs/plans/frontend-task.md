# Frontend Implementation Plan: Operations (Shifts & Day Closings)

| Status | Task | Description |
| :---: | :--- | :--- |
| [x] | **1. Scaffold Redux Slices** | Create `shiftSlice.js` and `dayClosingSlice.js` in the new `erp-frontend` store/features structure to handle CRUD actions and manage active shift state. |
| [x] | **2. Build Custom Hooks** | Create `useActiveShift` to provide global access to the current open shift and its date. |
| [x] | **3. Migrate UI Modals (Shift)** | Rebuild `CreateShiftDialog`, `CloseShiftDialog`, `ViewShiftDialog` using the new ERP UI theme and components. |
| [x] | **4. Migrate Pages (Shift)** | Rebuild `AllShifts.jsx` as feature pages in `erp-frontend`. |
| [x] | **5. Integrate with Sales/Billing** | Update the new ERP's equivalent of `CreateSaleBill` (e.g., `CreateInvoice`) to consume `useActiveShift`, locking the bill date to the shift date. |
| [ ] | **6. Backend Day Closing Summary** | Create `getDayClosingSummary` endpoint to aggregate shift totals (invoices, cash, upi). |
| [ ] | **7. Migrate UI Modals (Day Closing)** | Rebuild `CreateDayClosingDialog`, `CloseDayClosingDialog`, and `ViewDayClosingDialog` mirroring the Shift dialogs. Show shift count, invoices per shift, and cash in/out. |
| [ ] | **8. Migrate Pages (Day Closing)** | Rebuild `AllDayClosings.jsx` as feature pages in `erp-frontend`. |
| [ ] | **9. Setup Routes & Menus** | Add the new Operations pages to the main application router and sidebar navigation. |
