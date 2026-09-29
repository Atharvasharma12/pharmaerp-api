# Task Plan: Implement Shift & Day Closing Modules

| Status | Task | Description |
| :---: | :--- | :--- |
| [x] | **1. Create Module Skeleton** | Create `src/modules/operations/shifts` and `src/modules/operations/day-closings` directories (models, controllers, routes, services). |
| [x] | **2. Port Shift Model** | Port `shiftModel.js` and its sub-schemas to the new architecture. Extract summary logic to services. |
| [x] | **3. Port Day Closing Model** | Port `dayClosingModel.js` and its sub-schemas to the new architecture. |
| [x] | **4. Port Shift Services** | Port `shiftService.js`, adapting to the new `finance` or `sales` modules as needed. |
| [x] | **5. Port Day Closing Services** | Port `dayClosingService.js`, adjusting dependencies and ensuring transactional safety. |
| [x] | **6. Port Controllers** | Port `shiftController.js` and `dayClosingController.js`. |
| [x] | **7. Setup Routes** | Port route definitions and register them in the main Express application. |
| [x] | **8. Verification** | Check imports, test endpoints locally, and ensure the module meets the Council's guardrails. |
