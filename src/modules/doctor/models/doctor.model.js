import mongoose from "mongoose";
import { DOCTOR_STATUS, DOCTOR_CODE_PREFIX } from "../constants/doctor.constant.js";

const doctorSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: [true, "Workspace is required"],
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: [true, "Company is required"],
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    doctorCode: {
      type: String,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Doctor name is required"],
      trim: true,
      minlength: [2, "Doctor name must be at least 2 characters"],
      maxlength: [160, "Doctor name cannot exceed 160 characters"],
      index: true,
    },

    hospitalName: {
      type: String,
      trim: true,
      maxlength: [200, "Hospital name cannot exceed 200 characters"],
      default: null,
    },

    specialty: {
      type: String,
      trim: true,
      maxlength: [100, "Specialty cannot exceed 100 characters"],
      default: null,
      index: true,
    },

    registrationNumber: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [100, "Registration number cannot exceed 100 characters"],
      default: null,
    },

    address: {
      type: String,
      trim: true,
      maxlength: [500, "Address cannot exceed 500 characters"],
      default: null,
    },

    mobile: {
      type: String,
      trim: true,
      match: [/^[6-9][0-9]{9}$/, "Invalid mobile number"],
      default: null,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [200, "Email cannot exceed 200 characters"],
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address"],
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(DOCTOR_STATUS),
      default: DOCTOR_STATUS.ACTIVE,
      index: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const generateDoctorCode = async () => {
  const Doctor = mongoose.models.Doctor;
  if (!Doctor) return `${DOCTOR_CODE_PREFIX}${Math.floor(100000 + Math.random() * 900000)}`;

  while (true) {
    const code = `${DOCTOR_CODE_PREFIX}${Math.floor(100000 + Math.random() * 900000)}`;
    const exists = await Doctor.exists({ doctorCode: code, isDeleted: false });
    if (!exists) return code;
  }
};

doctorSchema.pre("validate", async function () {
  if (!this.doctorCode) {
    this.doctorCode = await generateDoctorCode();
  }
});

doctorSchema.methods.toSafeObject = function () {
  const doctor = this.toObject();
  delete doctor.__v;
  return doctor;
};

doctorSchema.index(
  { doctorCode: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

doctorSchema.index({
  workspaceId: 1,
  companyId: 1,
  isDeleted: 1,
});

doctorSchema.index({
  companyId: 1,
  name: 1,
  isDeleted: 1,
});

doctorSchema.index({
  companyId: 1,
  specialty: 1,
  isDeleted: 1,
});

doctorSchema.index({
  companyId: 1,
  status: 1,
  isDeleted: 1,
});

const Doctor = mongoose.models.Doctor || mongoose.model("Doctor", doctorSchema);

export default Doctor;
