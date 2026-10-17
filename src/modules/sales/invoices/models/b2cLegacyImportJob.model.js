import mongoose from "mongoose";

const b2cLegacyImportJobSchema = new mongoose.Schema(
  {
    migrationId: {
      type: String,
      required: [true, "Migration ID is required"],
      unique: true,
      trim: true,
      index: true,
    },

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

    filePath: {
      type: String,
      required: [true, "File path is required"],
      trim: true,
    },

    originalFileName: {
      type: String,
      required: [true, "Original file name is required"],
      trim: true,
    },

    fileSize: {
      type: Number,
      default: 0,
    },

    sheetName: {
      type: String,
      default: null,
      trim: true,
    },

    columnMapping: {
      customerNameField: { type: String, default: null, trim: true },
      mobileNumberField: { type: String, default: null, trim: true },
      medicineField: { type: String, default: null, trim: true },
    },

    status: {
      type: String,
      enum: ["pending", "processing", "paused", "completed", "failed"],
      default: "pending",
      index: true,
    },

    chunkSize: {
      type: Number,
      default: 1000,
    },

    totalRows: {
      type: Number,
      default: 0,
    },

    processedRows: {
      type: Number,
      default: 0,
    },

    validRows: {
      type: Number,
      default: 0,
    },

    skippedRows: {
      type: Number,
      default: 0,
    },

    lastProcessedRow: {
      type: Number,
      default: 0,
    },

    uniqueCustomersCount: {
      type: Number,
      default: 0,
    },

    customersCreated: {
      type: Number,
      default: 0,
    },

    customersExisting: {
      type: Number,
      default: 0,
    },

    matchedProducts: {
      type: Number,
      default: 0,
    },

    unmatchedProducts: {
      type: Number,
      default: 0,
    },

    invoicesCreated: {
      type: Number,
      default: 0,
    },

    skippedRecords: {
      type: [
        {
          rowNumber: { type: Number },
          reason: { type: String },
          value: { type: String },
        },
      ],
      default: [],
    },

    unmatchedMedicines: {
      type: [
        {
          medicineName: { type: String },
          rowNumber: { type: Number },
        },
      ],
      default: [],
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    errorMessage: {
      type: String,
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

b2cLegacyImportJobSchema.index({ workspaceId: 1, status: 1 });
b2cLegacyImportJobSchema.index({ workspaceId: 1, createdAt: -1 });

const B2CLegacyImportJob =
  mongoose.models.B2CLegacyImportJob ||
  mongoose.model("B2CLegacyImportJob", b2cLegacyImportJobSchema);

export default B2CLegacyImportJob;
