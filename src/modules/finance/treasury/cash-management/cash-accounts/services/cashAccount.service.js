import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import cashAccountRepository from "../repositories/cashAccount.repository.js";
import accountGroupRepository from "../../../../chart-of-accounts/repositories/accountGroup.repository.js";
import accountRepository from "../../../../chart-of-accounts/repositories/account.repository.js";
import Account from "../../../../chart-of-accounts/models/account.model.js";
import JournalLine from "../../../../journal-vouchers/models/journalLine.model.js";
import openingBalanceService from "../../../../opening-balances/services/openingBalance.service.js";
import cashDenominationRepository from "../../cash-denominations/repositories/cashDenomination.repository.js";
import { CASH_DENOMINATION_STATUS } from "../../cash-denominations/constants/cashDenomination.constant.js";
import cashDenominationBalanceRepository from "../../cash-denomination-balances/repositories/cashDenominationBalance.repository.js";

const createCashAccount = async (workspaceId, companyId, userId, payload) => {
  const {
    accountName,
    description,
    openingBalance = 0,
    openingBalanceType = "dr",
    denominations,
    isPrimary,
    branchId,
  } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Check for duplicate account name in this branch (branch-scoped uniqueness)
    const existing = await mongoose
      .model("CashAccount")
      .findOne({
        companyId,
        branchId: branchId || null,
        accountName: String(accountName).trim(),
        isDeleted: false,
      })
      .session(session);

    if (existing) {
      throw new ApiError(
        400,
        branchId
          ? "A cash account with this name already exists for this branch"
          : "A cash account with this name already exists for this company",
      );
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
        openingBalanceType: openingBalanceType || "dr",
        status: "active",
        isSystemAccount: true,
        createdBy: userId,
      },
      { session },
    );

    // 5. Save Cash Account (openingBalance is NOT stored here — lives on the ledger Account)
    const cashAccountPayload = {
      workspaceId,
      companyId,
      branchId: branchId || null,
      accountName: String(accountName).trim(),
      description: description || null,
      ledgerAccountId: ledgerAccount._id,
      isPrimary: !!isPrimary,
      isSystemDefault: !!payload.isSystemDefault,
      createdBy: userId,
    };

    const cashAccount = await cashAccountRepository.createCashAccount(
      cashAccountPayload,
      { session },
    );

    // 6. Handle isPrimary logic (branch-scoped — each branch has its own default)
    if (isPrimary) {
      await cashAccountRepository.setPrimaryCashAccount(
        cashAccount._id,
        companyId,
        workspaceId,
        branchId || null,
        { session },
      );
      cashAccount.isPrimary = true;
    } else {
      // If this is the FIRST cash account in this branch, automatically make it primary
      const branchFilter = { companyId, isDeleted: false };
      if (branchId) branchFilter.branchId = branchId;
      else branchFilter.branchId = null;

      const activeCount = await mongoose
        .model("CashAccount")
        .countDocuments(branchFilter)
        .session(session);

      if (activeCount === 1) {
        cashAccount.isPrimary = true;
        await cashAccountRepository.setPrimaryCashAccount(
          cashAccount._id,
          companyId,
          workspaceId,
          branchId || null,
          { session },
        );
      }
    }

    // 7. If opening balance provided → post opening balance journal entry
    //    This creates ledger entries + updates AccountBalance for the linked ledger account
    if (openingBalance && openingBalance > 0) {
      await openingBalanceService.postOpeningBalanceJournal(
        workspaceId,
        companyId,
        userId,
        ledgerAccount._id,
        openingBalance,
        openingBalanceType,
        { session },
      );

      // 8. If denomination breakdown provided → create a CONFIRMED cash denomination count
      //    physicalTotal must equal openingBalance for integrity
      if (denominations && denominations.length > 0) {
        const processedDenominations = denominations.map((d) => ({
          denomination: d.denomination,
          quantity: d.quantity || 0,
          subtotal: d.denomination * (d.quantity || 0),
        }));

        const physicalTotal = processedDenominations.reduce(
          (sum, d) => sum + d.subtotal,
          0,
        );

        // Validate that denomination total matches opening balance
        const tolerance = 0.01;
        if (Math.abs(physicalTotal - openingBalance) > tolerance) {
          throw new ApiError(
            400,
            `Denomination total (₹${physicalTotal}) does not match opening balance (₹${openingBalance})`,
          );
        }

        // Generate count number
        const countNumber = await cashDenominationRepository.getNextCountNumber(
          companyId,
          workspaceId,
          { session },
        );

        const denomRecord = await cashDenominationRepository.createCashDenomination(
          {
            workspaceId,
            companyId,
            cashAccountId: cashAccount._id,
            branchId: branchId || null,
            countNumber,
            countDate: new Date(),
            denominations: processedDenominations,
            physicalTotal,
            expectedBalance: openingBalance,
            variance: 0,
            narration: `Opening balance denomination count`,
            status: CASH_DENOMINATION_STATUS.CONFIRMED,
            confirmedAt: new Date(),
            confirmedBy: userId,
            createdBy: userId,
          },
          { session },
        );

        // 9. Create the CashDenominationBalance document with initial quantities
        //    This is the running balance that will be updated on every cash movement
        await cashDenominationBalanceRepository.createBalance(
          {
            workspaceId,
            companyId,
            cashAccountId: cashAccount._id,
            totalBalance: physicalTotal,
            denominations: processedDenominations,
            lastUpdatedAt: new Date(),
            lastUpdatedBy: userId,
          },
          { session },
        );
      }
    } else {
      // 9b. Always create an empty CashDenominationBalance document even with zero opening balance
      //     so the account is always tracked and ready for future movements
      await cashDenominationBalanceRepository.createBalance(
        {
          workspaceId,
          companyId,
          cashAccountId: cashAccount._id,
          totalBalance: 0,
          denominations: [],
          lastUpdatedAt: new Date(),
          lastUpdatedBy: userId,
        },
        { session },
      );
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

  // Attach denomination balance for each account in parallel
  const cashAccountsWithBalance = await Promise.all(
    result.cashAccounts.map(async (c) => {
      const denominationBalance =
        await cashDenominationBalanceRepository.findByCashAccountId(c._id);
      return {
        ...c.toSafeObject(),
        denominationBalance: denominationBalance
          ? {
              totalBalance: denominationBalance.totalBalance,
              denominations: denominationBalance.denominations,
              lastUpdatedAt: denominationBalance.lastUpdatedAt,
            }
          : null,
      };
    }),
  );

  return {
    cashAccounts: cashAccountsWithBalance,
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

  // Attach running denomination balance for full visibility
  const denominationBalance =
    await cashDenominationBalanceRepository.findByCashAccountId(cashAccount._id);

  return {
    ...cashAccount.toSafeObject(),
    denominationBalance: denominationBalance
      ? {
          totalBalance: denominationBalance.totalBalance,
          denominations: denominationBalance.denominations,
          lastUpdatedAt: denominationBalance.lastUpdatedAt,
        }
      : null,
  };
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

    // Guard: system default account fields are immutable
    if (cashAccount.isSystemDefault) {
      const BLOCKED_FIELDS = ["accountName", "status", "isPrimary"];
      const attemptedBlocked = BLOCKED_FIELDS.filter(
        (k) => payload[k] !== undefined,
      );
      if (attemptedBlocked.length > 0) {
        throw new ApiError(
          403,
          `Cannot modify [${attemptedBlocked.join(", ")}] on the system default cash account. Only description can be updated.`,
        );
      }
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

    if (description !== undefined)
      cashAccount.description = description || null;

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
      // Guard: cannot change primary if a system default exists in this branch
      const existingSystemDefault = await mongoose
        .model("CashAccount")
        .findOne({
          companyId,
          workspaceId,
          branchId: cashAccount.branchId || null,
          isSystemDefault: true,
          isDeleted: false,
        })
        .session(session);

      if (existingSystemDefault && !cashAccount.isSystemDefault) {
        throw new ApiError(
          403,
          "Cannot change the default cash account. The system default account is permanently set for this branch.",
        );
      }

      // Pass branchId so only accounts in the same branch are un-defaulted
      await cashAccountRepository.setPrimaryCashAccount(
        cashAccount._id,
        companyId,
        workspaceId,
        cashAccount.branchId || null,
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

    // Guard: system default cash account cannot be deleted
    if (cashAccount.isSystemDefault) {
      throw new ApiError(
        403,
        "The system default cash account cannot be deleted. It is permanently linked to the branch operations.",
      );
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

    // 4. Auto-resolve primary if this was primary — find next in SAME branch
    if (cashAccount.isPrimary) {
      const branchFilter = { companyId, isDeleted: false };
      // Match the deleted account's branch scope for the replacement
      if (cashAccount.branchId) branchFilter.branchId = cashAccount.branchId;
      else branchFilter.branchId = null;

      const nextCashAccount = await mongoose
        .model("CashAccount")
        .findOne(branchFilter)
        .session(session);

      if (nextCashAccount) {
        await cashAccountRepository.setPrimaryCashAccount(
          nextCashAccount._id,
          companyId,
          workspaceId,
          cashAccount.branchId || null,
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
