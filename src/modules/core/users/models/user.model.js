import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const IMAGE_SCHEMA = new mongoose.Schema(
  {
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
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    userCode: {
      type: String,
      trim: true,
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [40, "Username cannot exceed 40 characters"],
      match: [
        /^[a-z0-9._-]+$/,
        "Username can only contain letters, numbers, dot, underscore and hyphen",
      ],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      maxlength: [200, "Email cannot exceed 200 characters"],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phone: {
      type: String,
      trim: true,
      default: null,
      match: [/^[6-9][0-9]{9}$/, "Invalid phone number"],
    },

    phoneVerified: {
      type: Boolean,
      default: false,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      select: false,
      minlength: [6, "Password must be at least 6 characters"],
    },

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [120, "Full name cannot exceed 120 characters"],
    },

    avatar: {
      type: IMAGE_SCHEMA,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    resetPasswordTokenHash: {
      type: String,
      default: null,
      index: true,
      select: false,
    },

    resetPasswordExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

const generateUserCode = async () => {
  const User = mongoose.models.User || mongoose.model("User");

  while (true) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const exists = await User.exists({ userCode: code });

    if (!exists) return code;
  }
};

userSchema.pre("validate", async function (next) {
  if (!this.userCode) {
    this.userCode = await generateUserCode();
  }

  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();

  next();
});

userSchema.methods.comparePassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString("hex");

  this.resetPasswordTokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  this.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

  return rawToken;
};

userSchema.methods.clearPasswordResetToken = function () {
  this.resetPasswordTokenHash = null;
  this.resetPasswordExpiresAt = null;
};

userSchema.methods.toSafeObject = function () {
  const user = this.toObject();

  delete user.password;
  delete user.resetPasswordTokenHash;
  delete user.resetPasswordExpiresAt;
  delete user.__v;

  return user;
};

userSchema.index(
  { userCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

userSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

userSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      phone: { $type: "string" },
    },
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
