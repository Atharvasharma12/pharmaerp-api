import ApiError from "../../../../utils/ApiError.js";

import userRepository from "../repositories/user.repository.js";

const getMyProfile = async (userId) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user.toSafeObject();
};

const updateMyProfile = async (userId, payload) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const allowedFields = ["fullName"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      user[field] = payload[field];
    }
  });

  await userRepository.saveUser(user);

  return user.toSafeObject();
};

const updateMyAvatar = async (userId, avatar) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.avatar = avatar;

  await userRepository.saveUser(user);

  return user.toSafeObject();
};

const removeMyAvatar = async (userId) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.avatar = null;

  await userRepository.saveUser(user);

  return user.toSafeObject();
};

const updateMyEmail = async (userId, email) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  if (user.email === normalizedEmail) {
    throw new ApiError(400, "New email must be different from current email");
  }

  const existingUser = await userRepository.findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new ApiError(400, "Email already exists");
  }

  user.email = normalizedEmail;
  user.emailVerified = false;

  await userRepository.saveUser(user);

  return user.toSafeObject();
};

const updateMyPhone = async (userId, phone) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const normalizedPhone = phone ? String(phone).trim() : null;

  if (user.phone === normalizedPhone) {
    throw new ApiError(400, "New phone must be different from current phone");
  }

  if (normalizedPhone) {
    const existingUser = await userRepository.findUserByPhone(normalizedPhone);

    if (existingUser) {
      throw new ApiError(400, "Phone already exists");
    }
  }

  user.phone = normalizedPhone;
  user.phoneVerified = false;

  await userRepository.saveUser(user);

  return user.toSafeObject();
};

const deleteMyAccount = async (userId) => {
  const user = await userRepository.deleteUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return {
    success: true,
  };
};

export default {
  getMyProfile,
  updateMyProfile,
  updateMyAvatar,
  removeMyAvatar,
  updateMyEmail,
  updateMyPhone,
  deleteMyAccount,
};
