import mongoose from "mongoose";

import PlatformUser from "../models/platformUser.model.js";

const buildPlatformUserFilter = (query = {}) => {
  const filter = {
    isDeleted: false,
  };

  if (query.search) {
    const searchRegex = new RegExp(String(query.search).trim(), "i");

    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  if (query.role) {
    filter.role = query.role;
  }

  if (query.status) {
    filter.status = query.status;
  }

  return filter;
};

const createPlatformUser = async (payload) => {
  return PlatformUser.create(payload);
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

const findPlatformUserByEmail = async (email, options = {}) => {
  return PlatformUser.findOne({
    email: String(email).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const getPlatformUsers = async (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const filter = buildPlatformUserFilter(query);

  const [users, total] = await Promise.all([
    PlatformUser.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),

    PlatformUser.countDocuments(filter),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const savePlatformUser = async (platformUser) => {
  return platformUser.save();
};

const deletePlatformUserById = async (platformUserId) => {
  if (!mongoose.Types.ObjectId.isValid(platformUserId)) {
    return null;
  }

  return PlatformUser.findOneAndUpdate(
    {
      _id: platformUserId,
      isDeleted: false,
    },
    {
      isDeleted: true,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

export default {
  createPlatformUser,
  findPlatformUserById,
  findPlatformUserByEmail,
  getPlatformUsers,
  savePlatformUser,
  deletePlatformUserById,
};
