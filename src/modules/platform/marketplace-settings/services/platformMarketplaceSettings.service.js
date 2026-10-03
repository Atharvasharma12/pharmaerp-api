import ApiError from "../../../../utils/ApiError.js";

import platformMarketplaceSettingsRepository from "../repositories/platformMarketplaceSettings.repository.js";

const getPlatformUserId = (platformUser) => {
  return platformUser?._id || platformUser?.id || null;
};

const getOrCreateSettings = async () => {
  let settings =
    await platformMarketplaceSettingsRepository.getSettings();

  if (!settings) {
    settings =
      await platformMarketplaceSettingsRepository.createSettings({});
  }

  return settings;
};

const getMarketplaceSettings = async () => {
  const settings = await getOrCreateSettings();

  return settings.toSafeObject();
};

const updateMarketplaceSettings = async (payload, platformUser) => {
  const existing = await getOrCreateSettings();

  if (!existing) {
    throw new ApiError(404, "Marketplace settings not found");
  }

  const allowedFields = [
    "isMarketplaceEnabled",
    "defaultDeliveryRadiusKm",
    "defaultPreparationTimeMinutes",
    "defaultCommissionPercent",
    "safetyStockBuffer",
    "nearExpiryDaysThreshold",
    "autoRejectTimeoutSeconds",
    "minimumOrderAmount",
    "freeDeliveryThreshold",
    "defaultDeliveryCharge",
    "cancellationWindowMinutes",
    "returnWindowDays",
    "status",
  ];

  const updatePayload = {};

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      updatePayload[field] = payload[field];
    }
  });

  updatePayload.updatedBy = getPlatformUserId(platformUser);

  const updated =
    await platformMarketplaceSettingsRepository.updateSettings(updatePayload);

  if (!updated) {
    throw new ApiError(500, "Failed to update marketplace settings");
  }

  return updated.toSafeObject();
};

const enableMarketplace = async (platformUser) => {
  return updateMarketplaceSettings(
    { isMarketplaceEnabled: true },
    platformUser,
  );
};

const disableMarketplace = async (platformUser) => {
  return updateMarketplaceSettings(
    { isMarketplaceEnabled: false },
    platformUser,
  );
};

export default {
  getMarketplaceSettings,
  updateMarketplaceSettings,
  enableMarketplace,
  disableMarketplace,
};
