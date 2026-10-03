import mongoose from "mongoose";
import FinancialPeriod from "../models/financialPeriod.model.js";

const createPeriod = async (payload, options = {}) => {
  const [period] = await FinancialPeriod.create([payload], {
    session: options.session || null,
  });
  return period;
};

const findPeriodByIdCompanyAndWorkspace = async (
  periodId,
  companyId,
  workspaceId,
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(periodId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return FinancialPeriod.findOne({
    _id: periodId,
    companyId,
    workspaceId,
  }).session(options.session || null);
};

const findOverlapPeriod = async (
  companyId,
  periodType,
  startDate,
  endDate,
  options = {}
) => {
  if (!mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }

  return FinancialPeriod.findOne({
    companyId,
    periodType,
    startDate: { $lte: new Date(endDate) },
    endDate: { $gte: new Date(startDate) },
  }).session(options.session || null);
};

const findPeriodByDate = async (
  companyId,
  workspaceId,
  date,
  periodType = "YEAR",
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  const queryDate = new Date(date);

  return FinancialPeriod.findOne({
    companyId,
    workspaceId,
    periodType,
    startDate: { $lte: queryDate },
    endDate: { $gte: queryDate },
  }).session(options.session || null);
};

const getPeriods = async (
  workspaceId,
  companyId,
  filters = {},
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { periods: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
  };

  if (filters.periodType) {
    query.periodType = filters.periodType;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.isCurrent !== undefined) {
    query.isCurrent = filters.isCurrent === "true" || filters.isCurrent === true;
  }

  const sort = options.sort || { startDate: -1 };

  if (options.all === true) {
    const periods = await FinancialPeriod.find(query)
      .sort(sort)
      .session(options.session || null);
    return { periods, total: periods.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [periods, total] = await Promise.all([
    FinancialPeriod.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .session(options.session || null),
    FinancialPeriod.countDocuments(query).session(options.session || null),
  ]);

  return { periods, total, page, limit };
};

export default {
  createPeriod,
  findPeriodByIdCompanyAndWorkspace,
  findOverlapPeriod,
  findPeriodByDate,
  getPeriods,
};
