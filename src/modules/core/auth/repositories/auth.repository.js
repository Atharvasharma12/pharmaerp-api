import User from "../../users/models/user.model.js";

const findUserByEmail = async (email, options = {}) => {
  return User.findOne({
    email: String(email).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findUserByUsername = async (username, options = {}) => {
  return User.findOne({
    username: String(username).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findUserById = async (userId, options = {}) => {
  return User.findOne({
    _id: userId,
    isDeleted: false,
  }).select(options.select || "");
};

const findUserByEmailOrUsername = async (identifier, options = {}) => {
  return User.findOne({
    isDeleted: false,
    $or: [
      {
        email: String(identifier).trim().toLowerCase(),
      },
      {
        username: String(identifier).trim().toLowerCase(),
      },
    ],
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

export default {
  findUserByEmail,
  findUserByUsername,
  findUserById,
  findUserByEmailOrUsername,
  createUser,
  updateUser,
  saveUser,
  findUserByResetToken,
};
