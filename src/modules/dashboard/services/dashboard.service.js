import dashboardRepository from "../repositories/dashboard.repository.js";

const getDashboardOverview = async ({ workspaceId, companyId, branchId = null }) => {
  return dashboardRepository.getDashboardOverview({
    workspaceId,
    companyId,
    branchId,
  });
};

export default {
  getDashboardOverview,
};
