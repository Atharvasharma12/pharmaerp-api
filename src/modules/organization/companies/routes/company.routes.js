import { Router } from "express";

import authMiddleware from "../../../../middlewares/auth.middleware.js";
import workspaceContextMiddleware from "../../../../middlewares/workspaceContext.middleware.js";

import validate from "../../../../middlewares/validate.middleware.js";

import {
  createCompany,
  getWorkspaceCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "../controllers/company.controller.js";

import {
  createCompanySchema,
  updateCompanySchema,
} from "../validations/company.validation.js";

const router = Router();

router.use(authMiddleware);

router.use(workspaceContextMiddleware);

router.post("/", validate(createCompanySchema), createCompany);

router.get("/", getWorkspaceCompanies);

router.get("/:companyId", getCompanyById);

router.patch("/:companyId", validate(updateCompanySchema), updateCompany);

router.delete("/:companyId", deleteCompany);

export default router;
