import mongoose from "mongoose";
import { SHARED_CONTACT_RELATIONS } from "./sharedContactGroup.model.js";

export const CONFIRMATION_STATUS = {
  SUGGESTED: "suggested",
  CONFIRMED: "confirmed",
};

const customerRelationshipSchema = new mongoose.Schema(
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
    sharedContactGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SharedContactGroup",
      required: [true, "Shared contact group ID is required"],
      index: true,
    },
    sourceCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Source customer ID is required"],
      index: true,
    },
    targetCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Target customer ID is required"],
      index: true,
    },
    relationship: {
      type: String,
      enum: SHARED_CONTACT_RELATIONS,
      required: [true, "Relationship is required"],
      default: "Other",
    },
    confirmationStatus: {
      type: String,
      enum: Object.values(CONFIRMATION_STATUS),
      default: CONFIRMATION_STATUS.SUGGESTED,
      index: true,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index to prevent duplicate pairwise relationships per organization
customerRelationshipSchema.index(
  { workspaceId: 1, companyId: 1, sourceCustomerId: 1, targetCustomerId: 1 },
  { unique: true }
);

if (mongoose.models.CustomerRelationship) {
  delete mongoose.models.CustomerRelationship;
}

const CustomerRelationship = mongoose.model(
  "CustomerRelationship",
  customerRelationshipSchema
);

export default CustomerRelationship;
