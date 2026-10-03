import mongoose from "mongoose";

import PlatformUser from "../../users/models/platformUser.model.js";

const findPlatformUserByEmail = async (email, options = {}) => {
  return PlatformUser.findOne({
    email: String(email).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findPlatformUserById = async (platformUserId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(platformUserId)) {
    return null;
  }

  return PlatformUser.findOne({
    _id: platformUserId,
    isDeleted: false,
  }).select(options.select || "");
};

const savePlatformUser = async (platformUser) => {
  return platformUser.save();
};

export default {
  findPlatformUserByEmail,
  findPlatformUserById,
  savePlatformUser,
};
