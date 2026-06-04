import mongoose from "mongoose";

import Company from "../models/company.model.js";

const findCompanyById = async (companyId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }

  return Company.findOne({
    _id: companyId,
    isDeleted: false,
  }).select(options.select || "");
};

const findCompanyByIdAndWorkspace = async (
  companyId,
  workspaceId,
  options = {},
) => {
  if (
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Company.findOne({
    _id: companyId,
    workspaceId,
    isDeleted: false,
  }).select(options.select || "");
};

const findCompanyBySlug = async (workspaceId, slug, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return null;
  }

  return Company.findOne({
    workspaceId,
    slug: String(slug).trim().toLowerCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findCompanyByCode = async (companyCode, options = {}) => {
  if (!companyCode) {
    return null;
  }

  return Company.findOne({
    companyCode: String(companyCode).trim().toUpperCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findCompanyByGstin = async (workspaceId, gstin, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId) || !gstin) {
    return null;
  }

  return Company.findOne({
    workspaceId,
    gstin: String(gstin).trim().toUpperCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const createCompany = async (payload) => {
  return Company.create(payload);
};

const saveCompany = async (company) => {
  return company.save();
};

const getWorkspaceCompanies = async (workspaceId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return [];
  }

  return Company.find({
    workspaceId,
    isDeleted: false,
  })
    .sort(options.sort || { createdAt: -1 })
    .select(options.select || "");
};

const deleteCompanyById = async (companyId, workspaceId, deletedBy) => {
  if (
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return Company.findOneAndUpdate(
    {
      _id: companyId,
      workspaceId,
      isDeleted: false,
    },
    {
      isDeleted: true,
      status: "deleted",
      deletedAt: new Date(),
      deletedBy,
    },
    {
      new: true,
      runValidators: true,
    },
  );
};

const countWorkspaceCompanies = async (workspaceId) => {
  if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
    return 0;
  }

  return Company.countDocuments({
    workspaceId,
    isDeleted: false,
  });
};

export default {
  findCompanyById,
  findCompanyByIdAndWorkspace,
  findCompanyBySlug,
  findCompanyByCode,
  findCompanyByGstin,
  createCompany,
  saveCompany,
  getWorkspaceCompanies,
  deleteCompanyById,
  countWorkspaceCompanies,
};
