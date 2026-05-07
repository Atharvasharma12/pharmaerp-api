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

  const allowedFields = ["fullName", "phone"];

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

const getUsers = async (query) => {
  const page = Number(query.page) || 1;

  const limit = Number(query.limit) || 10;

  const search = query.search || "";

  const filter = {};

  if (search) {
    filter.$or = [
      {
        fullName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        email: {
          $regex: search,
          $options: "i",
        },
      },
      {
        username: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  return userRepository.findUsers(filter, {
    page,
    limit,
  });
};

const getUserById = async (userId) => {
  const user = await userRepository.findUserById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user.toSafeObject();
};

const updateUserStatus = async (userId, isActive) => {
  const user = await userRepository.updateUserById(userId, {
    isActive,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user.toSafeObject();
};

export default {
  getMyProfile,
  updateMyProfile,
  updateMyAvatar,
  removeMyAvatar,
  getUsers,
  getUserById,
  updateUserStatus,
};
