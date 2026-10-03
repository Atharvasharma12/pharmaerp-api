import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import financialPeriodRepository from "../repositories/financialPeriod.repository.js";
import FinancialPeriod from "../models/financialPeriod.model.js";
import { PERIOD_STATUS } from "../constants/financialPeriod.constant.js";

const createFinancialPeriod = async (workspaceId, companyId, userId, payload) => {
  const { startDate, endDate, periodType, periodCode, isCurrent, status } = payload;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start >= end) {
    throw new ApiError(400, "Start date must be before end date");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Enforce overlap checks
    const overlap = await financialPeriodRepository.findOverlapPeriod(
      companyId,
      periodType,
      start,
      end,
      { session }
    );

    if (overlap) {
      throw new ApiError(
        400,
        `Selected date range overlaps with an existing financial period (${overlap.periodCode})`
      );
    }

    // 2. Generate period code if not specified
    let finalCode = periodCode;
    if (!finalCode) {
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      const endYearShort = String(endYear).slice(-2);
      finalCode = `FY-${startYear}-${endYearShort}`;
    }

    // 3. Handle setting this as the current active period
    if (isCurrent === true) {
      await FinancialPeriod.updateMany(
        { companyId, periodType },
        { isCurrent: false },
        { session }
      );
    }

    // 4. Create document
    const period = await financialPeriodRepository.createPeriod(
      {
        workspaceId,
        companyId,
        periodCode: finalCode,
        periodType,
        startDate: start,
        endDate: end,
        isCurrent: isCurrent || false,
        status: status || PERIOD_STATUS.OPEN,
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return period.toSafeObject();
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const updatePeriodStatus = async (
  periodId,
  companyId,
  workspaceId,
  status,
  userId
) => {
  const period = await financialPeriodRepository.findPeriodByIdCompanyAndWorkspace(
    periodId,
    companyId,
    workspaceId
  );

  if (!period) {
    throw new ApiError(404, "Financial Period not found");
  }

  if (period.status === PERIOD_STATUS.LOCKED) {
    throw new ApiError(400, "Locked financial periods cannot be modified");
  }

  period.status = status;
  await period.save();

  return period.toSafeObject();
};

const getFinancialPeriods = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await financialPeriodRepository.getPeriods(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true }
  );

  return {
    periods: result.periods.map((p) => p.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getCurrentPeriod = async (workspaceId, companyId) => {
  // Try to find marked current
  let period = await FinancialPeriod.findOne({
    workspaceId,
    companyId,
    isCurrent: true,
  });

  if (!period) {
    // Fallback: most recent open period
    period = await FinancialPeriod.findOne({
      workspaceId,
      companyId,
      status: PERIOD_STATUS.OPEN,
    }).sort({ startDate: -1 });
  }

  if (!period) {
    throw new ApiError(404, "No active financial period found for this company");
  }

  return period.toSafeObject();
};

export default {
  createFinancialPeriod,
  updatePeriodStatus,
  getFinancialPeriods,
  getCurrentPeriod,
};
