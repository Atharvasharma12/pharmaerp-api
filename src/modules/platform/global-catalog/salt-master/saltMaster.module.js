import saltMasterRoutes from "./routes/saltMaster.routes.js";

const saltMasterModule = {
  path: "/salt-master",
  router: saltMasterRoutes,
};

export default saltMasterModule;
