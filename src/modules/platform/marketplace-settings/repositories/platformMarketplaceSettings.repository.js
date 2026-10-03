import PlatformMarketplaceSettings from "../models/platformMarketplaceSettings.model.js";

const getSettings = async () => {
  return PlatformMarketplaceSettings.findOne();
};

const createSettings = async (payload) => {
  return PlatformMarketplaceSettings.create(payload);
};

const updateSettings = async (payload) => {
  return PlatformMarketplaceSettings.findOneAndUpdate(
    {},
    { $set: payload },
    {
      new: true,
      runValidators: true,
    },
  );
};

export default {
  getSettings,
  createSettings,
  updateSettings,
};
