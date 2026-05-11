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

const findUserByEmail = async (email, options = {}) => {
  return User.findOne({
    email: String(email).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findUserByPhone = async (phone, options = {}) => {
  return User.findOne({
    phone: String(phone).trim(),
    isDeleted: false,
  }).select(options.select || "");
};

const saveUser = async (user) => {
  return user.save();
};

const deleteUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return User.findOneAndUpdate(
    {
      _id: userId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      isActive: false,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

export default {
  findUserById,
  findUserByEmail,
  findUserByPhone,
  saveUser,
  deleteUserById,
};
