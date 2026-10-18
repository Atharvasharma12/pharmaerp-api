import mongoose from "mongoose";

const b2cLegacyImportStagingSchema = new mongoose.Schema(
  {
    migrationId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },

    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    mobileNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    customerName: {
      type: String,
      trim: true,
      default: null,
    },

    productIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "WorkspaceProduct",
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: ["pending", "migrated"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

b2cLegacyImportStagingSchema.index(
  {
    migrationId: 1,
    workspaceId: 1,
    mobileNumber: 1,
  },
  {
    unique: true,
  }
);

b2cLegacyImportStagingSchema.index({
  migrationId: 1,
  workspaceId: 1,
  status: 1,
});

const B2CLegacyImportStaging =
  mongoose.models.B2CLegacyImportStaging ||
  mongoose.model("B2CLegacyImportStaging", b2cLegacyImportStagingSchema);

export default B2CLegacyImportStaging;
