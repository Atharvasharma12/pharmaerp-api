// c:\Users\Intel\Desktop\erp\erp-backend\src\modules\platform\dashboard\services\platformDashboard.service.js

import platformDashboardRepository from "../repositories/platformDashboard.repository.js";

const getDashboardStats = async () => {
  const [overview, recentWorkspaces, recentVerifications, recentStores] =
    await Promise.all([
      platformDashboardRepository.getDashboardOverview(),
      platformDashboardRepository.getRecentWorkspaces(5),
      platformDashboardRepository.getRecentVerifications(5),
      platformDashboardRepository.getRecentStores(5),
    ]);

  return {
    overview,
    recentWorkspaces,
    recentVerifications,
    recentStores,
  };
};

export default {
  getDashboardStats,
};
