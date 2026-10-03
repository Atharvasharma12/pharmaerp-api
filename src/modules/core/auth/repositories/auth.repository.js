import mongoose from "mongoose";

import User from "../../users/models/user.model.js";

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

const findUserByIdentifier = async (identifier, options = {}) => {
  const clean = String(identifier || "").trim();
  const isPhone = /^[6-9][0-9]{9}$/.test(clean);

  const query = isPhone
    ? { phone: clean, isDeleted: false }
    : { email: clean.toLowerCase(), isDeleted: false };

  return User.findOne(query).select(options.select || "");
};

const findUserById = async (userId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return User.findOne({
    _id: userId,
    isDeleted: false,
  }).select(options.select || "");
};

const createUser = async (payload) => {
  return User.create(payload);
};

const updateUser = async (userId, payload) => {
  return User.findByIdAndUpdate(userId, payload, {
    new: true,
    runValidators: true,
  });
};

const saveUser = async (user) => {
  return user.save();
};

const findUserByResetToken = async (tokenHash) => {
  return User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: {
      $gt: new Date(),
    },
    isDeleted: false,
    isActive: true,
  }).select("+password +resetPasswordTokenHash +resetPasswordExpiresAt");
};

const findUserByEmailOtp = async (email, otpHash) => {
  return User.findOne({
    email: String(email).trim().toLowerCase(),
    emailOtpHash: otpHash,
    emailOtpExpiresAt: {
      $gt: new Date(),
    },
    isDeleted: false,
    isActive: true,
  }).select("+emailOtpHash +emailOtpExpiresAt");
};

export default {
  findUserByEmail,
  findUserByPhone,
  findUserByIdentifier,
  findUserById,
  createUser,
  updateUser,
  saveUser,
  findUserByResetToken,
  findUserByEmailOtp,
};
