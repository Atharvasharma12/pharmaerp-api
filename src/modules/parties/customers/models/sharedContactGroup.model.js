import mongoose from "mongoose";

export const SHARED_CONTACT_RELATIONS = [
  "Self",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Son",
  "Daughter",
  "Other",
];

const sharedContactMemberSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 1,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const sharedContactGroupSchema = new mongoose.Schema(
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
    normalizedPhone: {
      type: String,
      required: [true, "Normalized phone number is required"],
      trim: true,
      index: true,
    },
    members: {
      type: [sharedContactMemberSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness per organization & phone number
sharedContactGroupSchema.index(
  { workspaceId: 1, companyId: 1, normalizedPhone: 1 },
  { unique: true }
);

if (mongoose.models.SharedContactGroup) {
  delete mongoose.models.SharedContactGroup;
}

const SharedContactGroup = mongoose.model("SharedContactGroup", sharedContactGroupSchema);

export default SharedContactGroup;
