import { jest } from "@jest/globals";
import b2cLegacyImportService from "../../src/modules/sales/invoices/services/b2cLegacyImport.service.js";
import {
  uploadFileController,
  startImportController,
  pauseImportController,
  resumeImportController,
  getStatusController,
  getReportController,
} from "../../src/modules/sales/invoices/controllers/b2cLegacyImport.controller.js";

describe("Task 4: B2C Legacy Import Controller & Routes", () => {
  let req;
  let res;

  beforeEach(() => {
    req = {
      workspace: { _id: "ws123" },
      company: { _id: "co123" },
      branch: { _id: "br123" },
      user: { _id: "user123" },
      params: { migrationId: "MIG_001" },
      body: {},
      file: { path: "/tmp/sample.xlsx", originalname: "sample.xlsx", size: 1024 },
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("uploadFileController", () => {
    it("should return 400 if no file is provided", async () => {
      req.file = null;
      await uploadFileController(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });

    it("should create import job and return 201 with mapping info", async () => {
      const mockResult = {
        migrationId: "MIG_001",
        jobId: "job123",
        headers: ["Customer", "Mobile", "Medicine"],
        detectedMapping: {
          customerNameField: "Customer",
          mobileNumberField: "Mobile",
          medicineField: "Medicine",
        },
        totalRows: 500,
      };

      const spy = jest
        .spyOn(b2cLegacyImportService, "createImportJob")
        .mockResolvedValue(mockResult);

      await uploadFileController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockResult,
        })
      );

      spy.mockRestore();
    });
  });

  describe("startImportController", () => {
    it("should start import and return 200", async () => {
      req.body = {
        columnMapping: {
          customerNameField: "Customer",
          mobileNumberField: "Mobile",
          medicineField: "Medicine",
        },
      };

      const spy = jest
        .spyOn(b2cLegacyImportService, "startImportJob")
        .mockResolvedValue({ migrationId: "MIG_001", status: "processing" });

      await startImportController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Import started successfully",
        })
      );

      spy.mockRestore();
    });
  });

  describe("pauseImportController & resumeImportController", () => {
    it("should pause import successfully", async () => {
      const spy = jest
        .spyOn(b2cLegacyImportService, "pauseImportJob")
        .mockResolvedValue({ migrationId: "MIG_001", status: "paused" });

      await pauseImportController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Import paused successfully",
        })
      );

      spy.mockRestore();
    });

    it("should resume import successfully", async () => {
      const spy = jest
        .spyOn(b2cLegacyImportService, "resumeImportJob")
        .mockResolvedValue({ migrationId: "MIG_001", status: "processing" });

      await resumeImportController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Import resumed successfully",
        })
      );

      spy.mockRestore();
    });
  });

  describe("getStatusController & getReportController", () => {
    it("should return live progress status", async () => {
      const mockStatus = {
        migrationId: "MIG_001",
        status: "processing",
        totalRows: 1000,
        processedRows: 500,
        validRows: 400,
        skippedRows: 100,
        progressPercent: 50,
      };

      const spy = jest
        .spyOn(b2cLegacyImportService, "getImportStatus")
        .mockResolvedValue(mockStatus);

      await getStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockStatus,
        })
      );

      spy.mockRestore();
    });

    it("should return report details", async () => {
      const mockReport = {
        migrationId: "MIG_001",
        summary: { totalRows: 1000 },
        skippedRecords: [],
        unmatchedMedicines: [],
      };

      const spy = jest
        .spyOn(b2cLegacyImportService, "getImportReport")
        .mockResolvedValue(mockReport);

      await getReportController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: mockReport,
        })
      );

      spy.mockRestore();
    });
  });
});
