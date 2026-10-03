// src/modules/core/access-control/access-control.module.js

import accessControlRoutes from "./routes/access-control.routes.js";

const accessControlModule = {
  path: "/access-control",
  router: accessControlRoutes,
};

export default accessControlModule;
