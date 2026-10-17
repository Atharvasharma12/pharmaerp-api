import ApiResponse from "../../../../utils/ApiResponse.js";
import b2cLegacyImportService from "../services/b2cLegacyImport.service.js";

/**
 * Handles legacy Excel file upload and generates initial job with detected column mapping.
 */
export const uploadFileController = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json(new ApiResponse(400, "Please upload a valid Excel or CSV file"));
    }

    const workspaceId = req.workspace?._id;
    const companyId = req.company?._id;
    const branchId =
      req.headers?.["x-branch-id"] ||
      req.branchId ||
      req.branch?._id ||
      req.body?.branchId ||
      null;
    const userId = req.user?._id || null;

    const result = await b2cLegacyImportService.createImportJob({
      file: req.file,
      workspaceId,
      companyId,
      branchId,
      userId,
      options: req.body || {},
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "File uploaded and analyzed successfully", result));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.message || "Failed to process uploaded file"));
  }
};

/**
 * Starts or triggers processing of the import job.
 */
export const startImportController = async (req, res) => {
  try {
    const { migrationId } = req.params;
    const { columnMapping } = req.body || {};

    const job = await b2cLegacyImportService.startImportJob(
      migrationId,
      columnMapping
    );

    return res
      .status(200)
      .json(new ApiResponse(200, "Import started successfully", job));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.message || "Failed to start import job"));
  }
};

/**
 * Pauses an ongoing import job.
 */
export const pauseImportController = async (req, res) => {
  try {
    const { migrationId } = req.params;
    const job = await b2cLegacyImportService.pauseImportJob(migrationId);

    return res
      .status(200)
      .json(new ApiResponse(200, "Import paused successfully", job));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.message || "Failed to pause import job"));
  }
};

/**
 * Resumes a paused import job.
 */
export const resumeImportController = async (req, res) => {
  try {
    const { migrationId } = req.params;
    const job = await b2cLegacyImportService.resumeImportJob(migrationId);

    return res
      .status(200)
      .json(new ApiResponse(200, "Import resumed successfully", job));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.message || "Failed to resume import job"));
  }
};

/**
 * Returns real-time status and metrics.
 */
export const getStatusController = async (req, res) => {
  try {
    const { migrationId } = req.params;
    const workspaceId = req.workspace?._id;

    const status = await b2cLegacyImportService.getImportStatus(
      migrationId,
      workspaceId
    );

    if (!status) {
      return res
        .status(404)
        .json(new ApiResponse(404, "Migration job not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Import status fetched successfully", status));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.message || "Failed to get import status"));
  }
};

/**
 * Returns detailed completion summary, skipped records, and unmatched medicines.
 */
export const getReportController = async (req, res) => {
  try {
    const { migrationId } = req.params;
    const workspaceId = req.workspace?._id;

    const report = await b2cLegacyImportService.getImportReport(
      migrationId,
      workspaceId
    );

    if (!report) {
      return res
        .status(404)
        .json(new ApiResponse(404, "Migration job not found"));
    }

    return res
      .status(200)
      .json(new ApiResponse(200, "Import report fetched successfully", report));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiResponse(500, error.message || "Failed to get import report"));
  }
};
