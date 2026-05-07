import mongoose from "mongoose";

import User from "../models/user.model.js";

const findUserById = async (userId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return User.findOne({
    _id: userId,
    isDeleted: false,
  }).select(options.select || "");
};

const findUsers = async (filter = {}, options = {}) => {
  const {
    page = 1,
    limit = 10,
    sort = { createdAt: -1 },
    select = "",
  } = options;

  const skip = (page - 1) * limit;

  const query = {
    isDeleted: false,
    ...filter,
  };

  const [users, total] = await Promise.all([
    User.find(query).select(select).sort(sort).skip(skip).limit(limit),

    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

const updateUserById = async (userId, payload) => {
  return User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });
};

const saveUser = async (user) => {
  return user.save();
};

const deleteUserById = async (userId) => {
  return User.findByIdAndUpdate(
    userId,
    {
      isDeleted: true,
      isActive: false,
    },
    {
      new: true,
    },
  );
};

export default {
  findUserById,
  findUsers,
  updateUserById,
  saveUser,
  deleteUserById,
};
