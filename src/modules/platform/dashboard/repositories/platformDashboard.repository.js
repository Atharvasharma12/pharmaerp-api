// c:\Users\Intel\Desktop\erp\erp-backend\src\modules\platform\dashboard\repositories\platformDashboard.repository.js

import Workspace from "../../../organization/workspaces/models/workspace.model.js";
import Subscription from "../../../subscription/subscriptions/models/subscription.model.js";
import MarketplaceStore from "../../../marketplace/stores/models/marketplaceStore.model.js";
import PlatformStoreVerification from "../../store-verification/models/platformStoreVerification.model.js";
import GlobalProduct from "../../global-catalog/products/models/globalProduct.model.js";
import PlatformUser from "../../users/models/platformUser.model.js";

const getDashboardOverview = async () => {
  const [
    totalWorkspaces,
    activeSubscriptions,
    subscriptionsList,
    totalStores,
    onlineStores,
    pendingVerifications,
    totalGlobalProducts,
    totalPlatformUsers,
  ] = await Promise.all([
    Workspace.countDocuments({ isDeleted: false }),
    Subscription.countDocuments({ status: "ACTIVE", isDeleted: false }),
    Subscription.find({ status: "ACTIVE", isDeleted: false }).lean(),
    MarketplaceStore.countDocuments({ isDeleted: false }),
    MarketplaceStore.countDocuments({ onlineStatus: "online", isDeleted: false }),
    PlatformStoreVerification.countDocuments({ status: "pending", isDeleted: false }),
    GlobalProduct.countDocuments({ isDeleted: false }),
    PlatformUser.countDocuments({ isDeleted: false }),
  ]);

  // Compute MRR from active subscriptions
  const monthlyRecurringRevenue = subscriptionsList.reduce((acc, sub) => {
    const price = sub.pricePerUser || sub.currentPlanSnapshot?.pricePerUser || sub.amount || 0;
    return acc + price;
  }, 0);

  return {
    totalWorkspaces,
    activeSubscriptions,
    monthlyRecurringRevenue,
    totalStores,
    onlineStores,
    pendingVerifications,
    totalGlobalProducts,
    totalPlatformUsers,
  };
};

const getRecentWorkspaces = async (limit = 5) => {
  return Workspace.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("ownerId", "name email phone")
    .lean();
};

const getRecentVerifications = async (limit = 5) => {
  return PlatformStoreVerification.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("storeId", "name slug phone")
    .lean();
};

const getRecentStores = async (limit = 5) => {
  return MarketplaceStore.find({ isDeleted: false })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("ownerId", "name email phone")
    .lean();
};

export default {
  getDashboardOverview,
  getRecentWorkspaces,
  getRecentVerifications,
  getRecentStores,
};
