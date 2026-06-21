import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import accountRepository from "../../chart-of-accounts/repositories/account.repository.js";
import accountGroupRepository from "../../chart-of-accounts/repositories/accountGroup.repository.js";
import journalVoucherRepository from "../repositories/journalVoucher.repository.js";
import journalLineRepository from "../repositories/journalLine.repository.js";
import journalNumberService from "./journalNumber.service.js";
import journalPostingService from "./journalPosting.service.js";
import {
  JOURNAL_VOUCHER_TYPE,
  JOURNAL_VOUCHER_STATUS,
} from "../constants/journalVoucher.constant.js";

const getOrCreateOpeningBalanceEquityAccount = async (
  workspaceId,
  companyId,
  userId,
  options = {}
) => {
  const session = options.session;
  let obAccount = await accountRepository.findAccountByCode(companyId, "OB-EQUITY", {
    session,
  });

  if (obAccount) {
    return obAccount;
  }

  // Find a group under this company of nature EQUITY
  const groupResult = await accountGroupRepository.getGroups(
    workspaceId,
    companyId,
    { nature: "EQUITY" },
    { all: true, session }
  );

  let groupId;
  if (groupResult && groupResult.groups && groupResult.groups.length > 0) {
    groupId = groupResult.groups[0]._id;
  } else {
    // Fallback: search for any active group under the company
    const allGroups = await accountGroupRepository.getGroups(
      workspaceId,
      companyId,
      {},
      { all: true, session }
    );
    if (allGroups && allGroups.groups && allGroups.groups.length > 0) {
      groupId = allGroups.groups[0]._id;
    } else {
      throw new ApiError(
        400,
        "No account groups found. Please set up the Chart of Accounts first."
      );
    }
  }

  // Create the system Opening Balance Equity account
  const account = await accountRepository.createAccount(
    {
      workspaceId,
      companyId,
      accountCode: "OB-EQUITY",
      accountName: "Opening Balance Equity",
      accountGroupId: groupId,
      accountNature: "EQUITY",
      accountCategory: "EQUITY",
      openingBalance: 0,
      openingBalanceType: "cr",
      status: "active",
      isSystemAccount: true,
      createdBy: userId,
    },
    { session }
  );

  return account;
};

const postOpeningBalanceJournal = async (
  workspaceId,
  companyId,
  userId,
  accountId,
  amount,
  balanceType
) => {
  if (amount <= 0) {
    return null;
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Get or create offsetting equity account
    const obEquityAccount = await getOrCreateOpeningBalanceEquityAccount(
      workspaceId,
      companyId,
      userId,
      { session }
    );

    // 2. Generate unique voucher number
    const voucherNumber = await journalNumberService.generateVoucherNumber(
      companyId,
      JOURNAL_VOUCHER_TYPE.OPENING_BALANCE,
      { session }
    );

    // 3. Create Journal Voucher header
    const voucherPayload = {
      workspaceId,
      companyId,
      voucherNumber,
      voucherDate: new Date(),
      voucherType: JOURNAL_VOUCHER_TYPE.OPENING_BALANCE,
      referenceNumber: `OP-${accountId.toString().slice(-6)}`,
      narration: `Opening balance initialization`,
      totalDebit: amount,
      totalCredit: amount,
      status: JOURNAL_VOUCHER_STATUS.DRAFT,
      createdBy: userId,
    };

    const voucher = await journalVoucherRepository.createVoucher(voucherPayload, {
      session,
    });

    // 4. Build double-entry lines
    const lines = [];

    // Line 1: Target account gets the opening balance
    lines.push({
      workspaceId,
      companyId,
      voucherId: voucher._id,
      accountId,
      debit: balanceType.toLowerCase() === "dr" ? amount : 0,
      credit: balanceType.toLowerCase() === "cr" ? amount : 0,
      narration: "Target account opening balance",
    });

    // Line 2: Offset to Opening Balance Equity
    lines.push({
      workspaceId,
      companyId,
      voucherId: voucher._id,
      accountId: obEquityAccount._id,
      debit: balanceType.toLowerCase() === "cr" ? amount : 0,
      credit: balanceType.toLowerCase() === "dr" ? amount : 0,
      narration: "Offsetting opening balance entry",
    });

    await journalLineRepository.createLines(lines, { session });

    // 5. Post the voucher to update balances
    const postedVoucher = await journalPostingService.postJournalVoucher(
      voucher._id,
      companyId,
      workspaceId,
      userId,
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return postedVoucher;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export default {
  getOrCreateOpeningBalanceEquityAccount,
  postOpeningBalanceJournal,
};
