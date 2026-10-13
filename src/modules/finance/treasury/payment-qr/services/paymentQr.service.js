import mongoose from "mongoose";
import ApiError from "../../../../../utils/ApiError.js";
import paymentQrRepository from "../repositories/paymentQr.repository.js";
import BankAccount from "../../bank-management/bank-accounts/models/bankAccount.model.js";
import Branch from "../../../../organization/branches/models/branch.model.js";

// ---------------------------------------------------------------------------
// CREATE PAYMENT QR
// ---------------------------------------------------------------------------
const createPaymentQr = async (workspaceId, companyId, userId, payload) => {
  const { branchId, bankAccountId, upiId, label, provider, qrImageUrl, isPrimary } =
    payload;

  if (!branchId) {
    throw new ApiError(400, "Branch ID is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verify the branch exists, belongs to company and workspace, and is active
    const branch = await Branch.findOne({
      _id: branchId,
      companyId,
      workspaceId,
      isDeleted: false,
    }).session(session);

    if (!branch) {
      throw new ApiError(400, "Branch not found or inactive");
    }

    // 2. Verify the bank account exists, is active, and belongs to the company
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      companyId,
      workspaceId,
      isDeleted: false,
      isActive: true,
    }).session(session);

    if (!bankAccount) {
      throw new ApiError(400, "Bank Account not found or inactive");
    }

    // 3. Check for duplicate UPI ID in this branch
    const existing = await paymentQrRepository.findPaymentQrByUpiId(
      companyId,
      upiId,
      { session, branchId },
    );
    if (existing) {
      throw new ApiError(
        400,
        "A Payment QR with this UPI ID already exists for this branch",
      );
    }

    // 4. Create the Payment QR record
    const paymentQr = await paymentQrRepository.createPaymentQr(
      {
        workspaceId,
        companyId,
        branchId,
        bankAccountId,
        upiId: String(upiId).trim().toLowerCase(),
        label: label || null,
        provider: provider || "OTHER",
        qrImageUrl: qrImageUrl || null,
        isPrimary: !!isPrimary,
        createdBy: userId,
      },
      { session },
    );

    // 5. Handle isPrimary logic scoped to this branch
    if (isPrimary) {
      await paymentQrRepository.setPrimaryPaymentQr(
        paymentQr._id,
        companyId,
        workspaceId,
        branchId,
        { session },
      );
    } else {
      // Auto-set as primary if this is the first QR for the branch
      const branchCount = await mongoose
        .model("PaymentQr")
        .countDocuments({ companyId, branchId, isDeleted: false })
        .session(session);

      if (branchCount === 1) {
        await paymentQrRepository.setPrimaryPaymentQr(
          paymentQr._id,
          companyId,
          workspaceId,
          branchId,
          { session },
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return getPaymentQrById(paymentQr._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// GET PAYMENT QRs (LIST)
// ---------------------------------------------------------------------------
const getPaymentQrs = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await paymentQrRepository.getPaymentQrs(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    paymentQrs: result.paymentQrs.map((q) => q.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ---------------------------------------------------------------------------
// GET PAYMENT QR BY ID
// ---------------------------------------------------------------------------
const getPaymentQrById = async (id, companyId, workspaceId) => {
  const paymentQr =
    await paymentQrRepository.findPaymentQrByIdCompanyAndWorkspace(
      id,
      companyId,
      workspaceId,
    );
  if (!paymentQr) {
    throw new ApiError(404, "Payment QR not found");
  }
  return paymentQr.toSafeObject();
};

// ---------------------------------------------------------------------------
// UPDATE PAYMENT QR
// ---------------------------------------------------------------------------
const updatePaymentQr = async (id, companyId, workspaceId, userId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const paymentQr = await mongoose
      .model("PaymentQr")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!paymentQr) {
      throw new ApiError(404, "Payment QR not found");
    }

    const { label, provider, qrImageUrl, status, isPrimary } = payload;

    if (label !== undefined) paymentQr.label = label || null;
    if (provider !== undefined) paymentQr.provider = provider;
    if (qrImageUrl !== undefined) paymentQr.qrImageUrl = qrImageUrl || null;
    if (status !== undefined) paymentQr.status = status;

    await paymentQr.save({ session });

    if (isPrimary === true) {
      await paymentQrRepository.setPrimaryPaymentQr(
        paymentQr._id,
        companyId,
        workspaceId,
        paymentQr.branchId,
        { session },
      );
    }

    await session.commitTransaction();
    session.endSession();

    return getPaymentQrById(paymentQr._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// DELETE PAYMENT QR (soft delete)
// ---------------------------------------------------------------------------
const deletePaymentQr = async (id, companyId, workspaceId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const paymentQr = await mongoose
      .model("PaymentQr")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!paymentQr) {
      throw new ApiError(404, "Payment QR not found");
    }

    const wasPrimary = paymentQr.isPrimary;

    paymentQr.isDeleted = true;
    paymentQr.deletedAt = new Date();
    paymentQr.deletedBy = userId;
    paymentQr.isPrimary = false;
    paymentQr.status = "INACTIVE";
    await paymentQr.save({ session });

    // If deleted QR was primary, auto-assign primary to next available QR in that branch
    if (wasPrimary) {
      const nextQr = await mongoose
        .model("PaymentQr")
        .findOne({
          companyId,
          workspaceId,
          branchId: paymentQr.branchId,
          isDeleted: false,
          status: "ACTIVE",
        })
        .session(session);

      if (nextQr) {
        await paymentQrRepository.setPrimaryPaymentQr(
          nextQr._id,
          companyId,
          workspaceId,
          paymentQr.branchId,
          { session },
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return { success: true };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// SET PRIMARY
// ---------------------------------------------------------------------------
const setPrimaryPaymentQr = async (id, companyId, workspaceId) => {
  const paymentQr = await mongoose
    .model("PaymentQr")
    .findOne({ _id: id, companyId, workspaceId, isDeleted: false });

  if (!paymentQr) {
    throw new ApiError(404, "Payment QR not found");
  }

  await paymentQrRepository.setPrimaryPaymentQr(
    id,
    companyId,
    workspaceId,
    paymentQr.branchId,
  );

  return getPaymentQrById(id, companyId, workspaceId);
};

export default {
  createPaymentQr,
  getPaymentQrs,
  getPaymentQrById,
  updatePaymentQr,
  deletePaymentQr,
  setPrimaryPaymentQr,
};
