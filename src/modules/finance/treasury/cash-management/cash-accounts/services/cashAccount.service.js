import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import cashAccountRepository from "../repositories/cashAccount.repository.js";
import accountGroupRepository from "../../../../chart-of-accounts/repositories/accountGroup.repository.js";
import accountRepository from "../../../../chart-of-accounts/repositories/account.repository.js";
import Account from "../../../../chart-of-accounts/models/account.model.js";
import JournalLine from "../../../../journal-vouchers/models/journalLine.model.js";

const createCashAccount = async (workspaceId, companyId, userId, payload) => {
  const { accountName, description, openingBalance, isPrimary } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check for duplicate account name in this company
    const existing = await mongoose
      .model("CashAccount")
      .findOne({
        companyId,
        accountName: String(accountName).trim(),
        isDeleted: false,
      })
      .session(session);

    if (existing) {
      throw new ApiError(400, "A cash account with this name already exists for this company");
    }

    // 2. Find or create standard "Cash Accounts" group under Assets
    let cashGroup = await accountGroupRepository.findGroupByCode(
      companyId,
      "CASH_ACCOUNTS",
      { session },
    );

    if (!cashGroup) {
      cashGroup = await accountGroupRepository.createGroup(
        {
          workspaceId,
          companyId,
          groupCode: "CASH_ACCOUNTS",
          groupName: "Cash Accounts",
          parentGroupId: null,
          nature: "ASSET",
          isSystemGroup: true,
          createdBy: userId,
        },
        { session },
      );
    }

    // 3. Generate unique accountCode for Ledger Account
    const sanitizedName = String(accountName)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
      .slice(0, 12);
    const baseCode = `CSH-${sanitizedName}`;
    let accountCode = baseCode;
    let counter = 1;
    let existingAccount = await accountRepository.findAccountByCode(
      companyId,
      accountCode,
      { session },
    );
    while (existingAccount) {
      accountCode = `${baseCode}-${counter}`;
      existingAccount = await accountRepository.findAccountByCode(
        companyId,
        accountCode,
        { session },
      );
      counter++;
    }

    // 4. Create the system Asset account in the Chart of Accounts
    const ledgerAccount = await accountRepository.createAccount(
      {
        workspaceId,
        companyId,
        accountCode,
        accountName: String(accountName).trim(),
        accountGroupId: cashGroup._id,
        accountNature: "ASSET",
        accountCategory: "CASH",
        openingBalance: openingBalance || 0,
        openingBalanceType: "dr",
        status: "active",
        isSystemAccount: true,
        createdBy: userId,
      },
      { session },
    );

    // 5. Save Cash Account
    const cashAccountPayload = {
      workspaceId,
      companyId,
      accountName: String(accountName).trim(),
      description: description || null,
      openingBalance: openingBalance || 0,
      ledgerAccountId: ledgerAccount._id,
      isPrimary: !!isPrimary,
      createdBy: userId,
    };

    const cashAccount = await cashAccountRepository.createCashAccount(
      cashAccountPayload,
      { session },
    );

    // 6. Handle isPrimary logic
    if (isPrimary) {
      await cashAccountRepository.setPrimaryCashAccount(
        cashAccount._id,
        companyId,
        workspaceId,
        { session },
      );
      cashAccount.isPrimary = true;
    } else {
      // If this is the only cash account, automatically make it primary
      const activeCount = await mongoose
        .model("CashAccount")
        .countDocuments({ companyId, isDeleted: false })
        .session(session);

      if (activeCount === 1) {
        cashAccount.isPrimary = true;
        await cashAccountRepository.setPrimaryCashAccount(
          cashAccount._id,
          companyId,
          workspaceId,
          { session },
        );
      }
    }

    await session.commitTransaction();
    session.endSession();

    return getCashAccountById(cashAccount._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getCashAccounts = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await cashAccountRepository.getCashAccounts(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    cashAccounts: result.cashAccounts.map((c) => c.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getCashAccountById = async (id, companyId, workspaceId) => {
  const cashAccount =
    await cashAccountRepository.findCashAccountByIdCompanyAndWorkspace(
      id,
      companyId,
      workspaceId,
    );
  if (!cashAccount) {
    throw new ApiError(404, "Cash Account not found");
  }
  return cashAccount.toSafeObject();
};

const updateCashAccount = async (
  id,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cashAccount = await mongoose
      .model("CashAccount")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!cashAccount) {
      throw new ApiError(404, "Cash Account not found");
    }

    const { accountName, description, status, isPrimary } = payload;

    if (accountName !== undefined) {
      cashAccount.accountName = String(accountName).trim();
      // Sync name in ledger account
      await Account.updateOne(
        { _id: cashAccount.ledgerAccountId },
        { $set: { accountName: String(accountName).trim() } },
      ).session(session);
    }

    if (description !== undefined) cashAccount.description = description || null;

    if (status !== undefined) {
      cashAccount.status = status;
      const ledgerStatus = status === "active" ? "active" : "inactive";
      await Account.updateOne(
        { _id: cashAccount.ledgerAccountId },
        { $set: { status: ledgerStatus } },
      ).session(session);
    }

    await cashAccount.save({ session });

    if (isPrimary === true) {
      await cashAccountRepository.setPrimaryCashAccount(
        cashAccount._id,
        companyId,
        workspaceId,
        { session },
      );
      cashAccount.isPrimary = true;
    }

    await session.commitTransaction();
    session.endSession();

    return getCashAccountById(cashAccount._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const deleteCashAccount = async (id, companyId, workspaceId, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cashAccount = await mongoose
      .model("CashAccount")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!cashAccount) {
      throw new ApiError(404, "Cash Account not found");
    }

    // 1. Audit check: Ensure no posted journal entries reference the ledger account
    const transactionExists = await JournalLine.exists({
      accountId: cashAccount.ledgerAccountId,
    }).session(session);

    if (transactionExists) {
      throw new ApiError(
        400,
        "Cannot delete cash account because it has active ledger transactions",
      );
    }

    // 2. Soft-delete the cash account
    cashAccount.isDeleted = true;
    cashAccount.deletedAt = new Date();
    cashAccount.deletedBy = userId;
    cashAccount.isPrimary = false;
    await cashAccount.save({ session });

    // 3. Soft-delete the associated system ledger account
    await Account.updateOne(
      { _id: cashAccount.ledgerAccountId },
      {
        $set: {
          isDeleted: true,
          status: "inactive",
          deletedAt: new Date(),
          deletedBy: userId,
        },
      },
    ).session(session);

    // 4. Auto-resolve primary if this was primary
    if (cashAccount.isPrimary) {
      const nextCashAccount = await mongoose
        .model("CashAccount")
        .findOne({ companyId, isDeleted: false })
        .session(session);

      if (nextCashAccount) {
        await cashAccountRepository.setPrimaryCashAccount(
          nextCashAccount._id,
          companyId,
          workspaceId,
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

export default {
  createCashAccount,
  getCashAccounts,
  getCashAccountById,
  updateCashAccount,
  deleteCashAccount,
};
