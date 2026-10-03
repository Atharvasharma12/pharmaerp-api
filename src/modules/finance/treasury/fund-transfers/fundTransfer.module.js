import fundTransferRoutes from "./routes/fundTransfer.routes.js";

const fundTransferModule = {
  path: "/fund-transfers",
  router: fundTransferRoutes,
};

export default fundTransferModule;
