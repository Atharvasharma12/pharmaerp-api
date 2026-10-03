import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import PLATFORM_ROLES, {
  PLATFORM_ROLE_LIST,
  PLATFORM_DEFAULT_ROLE,
} from "../../../../constants/platformRoles.constant.js";

import PLATFORM_USER_STATUS, {
  PLATFORM_USER_STATUS_LIST,
  PLATFORM_DEFAULT_USER_STATUS,
} from "../../../../constants/platformStatus.constant.js";

const platformUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [120, "Name cannot exceed 120 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: [200, "Email cannot exceed 200 characters"],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: PLATFORM_ROLE_LIST,
      default: PLATFORM_DEFAULT_ROLE,
      index: true,
    },

    status: {
      type: String,
      enum: PLATFORM_USER_STATUS_LIST,
      default: PLATFORM_DEFAULT_USER_STATUS,
      index: true,
    },

    avatar: {
      publicId: {
        type: String,
        trim: true,
        default: null,
      },

      url: {
        type: String,
        trim: true,
        default: null,
      },
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PlatformUser",
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

platformUserSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);

  this.passwordChangedAt = new Date();
});

platformUserSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

platformUserSchema.methods.isSuperAdmin = function () {
  return this.role === PLATFORM_ROLES.SUPER_ADMIN;
};

platformUserSchema.methods.toSafeObject = function () {
  const user = this.toObject();

  delete user.password;
  delete user.__v;

  return user;
};

platformUserSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
    },
  },
);

const PlatformUser =
  mongoose.models.PlatformUser ||
  mongoose.model("PlatformUser", platformUserSchema);

export default PlatformUser;
