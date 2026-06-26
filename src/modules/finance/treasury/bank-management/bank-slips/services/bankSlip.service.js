import mongoose from "mongoose";
import ApiError from "../../../../../../utils/ApiError.js";
import bankSlipRepository from "../repositories/bankSlip.repository.js";
import {
  BANK_SLIP_TYPE,
  BANK_SLIP_STATUS,
} from "../constants/bankSlip.constant.js";

import accountGroupRepository from "../../../../chart-of-accounts/repositories/accountGroup.repository.js";
import accountRepository from "../../../../chart-of-accounts/repositories/account.repository.js";
import journalVoucherRepository from "../../../../journal-vouchers/repositories/journalVoucher.repository.js";
import journalLineRepository from "../../../../journal-vouchers/repositories/journalLine.repository.js";
import journalPostingService from "../../../../journal-vouchers/services/journalPosting.service.js";
import { VOUCHER_TYPE } from "../../../../journal-vouchers/constants/voucherType.constant.js";
import voucherNumberService from "../../../../journal-vouchers/services/voucherNumber.service.js";
import BankAccount from "../../bank-accounts/models/bankAccount.model.js";

// ---------------------------------------------------------------------------
// HELPER — find or auto-create "Cash In Hand" system account for the offset
//           when cash is physically handed over to/from the bank
// ---------------------------------------------------------------------------
const findOrCreateCashInHandAccount = async (
  workspaceId,
  companyId,
  userId,
  session,
) => {
  let account = await accountRepository.findAccountByCode(
    companyId,
    "CASH_IN_HAND",
    { session },
  );
  if (account) return account;

  let group = await accountGroupRepository.findGroupByCode(
    companyId,
    "CASH_ACCOUNTS",
    { session },
  );
  if (!group) {
    group = await accountGroupRepository.createGroup(
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

  account = await accountRepository.createAccount(
    {
      workspaceId,
      companyId,
      accountCode: "CASH_IN_HAND",
      accountName: "Cash In Hand",
      accountGroupId: group._id,
      accountNature: "ASSET",
      accountCategory: "CASH",
      openingBalance: 0,
      openingBalanceType: "dr",
      status: "active",
      isSystemAccount: true,
      createdBy: userId,
    },
    { session },
  );
  return account;
};

// ---------------------------------------------------------------------------
// 1. CREATE BANK SLIP (Status: PENDING)
//    No journal entry at this stage — slip is just a record/document
// ---------------------------------------------------------------------------
const createBankSlip = async (workspaceId, companyId, userId, payload) => {
  const {
    bankAccountId,
    slipType,
    bankSlipReference,
    slipDate,
    amount,
    narration,
  } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verify bank account
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      companyId,
      workspaceId,
      isDeleted: false,
    }).session(session);

    if (!bankAccount) {
      throw new ApiError(400, "Bank Account not found or inactive");
    }

    // 2. Generate slip number
    const slipNumber = await bankSlipRepository.getNextSlipNumber(
      companyId,
      workspaceId,
      { session },
    );

    // 3. Save slip record (PENDING, no journal yet)
    const bankSlip = await bankSlipRepository.createBankSlip(
      {
        workspaceId,
        companyId,
        slipNumber,
        bankAccountId,
        slipType,
        bankSlipReference: bankSlipReference || null,
        slipDate: new Date(slipDate),
        amount,
        narration: narration || null,
        status: BANK_SLIP_STATUS.PENDING,
        createdBy: userId,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return getBankSlipById(bankSlip._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 2. SUBMIT SLIP (PENDING → SUBMITTED)
//    Marks that the slip has been physically taken to the bank.
//    No journal entry yet — money hasn't moved in the books.
// ---------------------------------------------------------------------------
const submitBankSlip = async (id, companyId, workspaceId, userId, payload) => {
  const bankSlip = await mongoose
    .model("BankSlip")
    .findOne({ _id: id, companyId, workspaceId, isDeleted: false });

  if (!bankSlip) throw new ApiError(404, "Bank Slip not found");
  if (bankSlip.status !== BANK_SLIP_STATUS.PENDING) {
    throw new ApiError(
      400,
      `Slip cannot be submitted from status: ${bankSlip.status}`,
    );
  }

  if (payload?.bankSlipReference) {
    bankSlip.bankSlipReference = payload.bankSlipReference;
  }

  bankSlip.status = BANK_SLIP_STATUS.SUBMITTED;
  bankSlip.submittedAt = new Date();
  bankSlip.submittedBy = userId;
  await bankSlip.save();

  return getBankSlipById(bankSlip._id, companyId, workspaceId);
};

// ---------------------------------------------------------------------------
// 3. CONFIRM SLIP (SUBMITTED → CONFIRMED)
//    Bank has processed the slip. NOW we create the journal entry:
//
//    CASH_DEPOSIT (cash goes into bank):
//      Bank A/c Dr        (bank balance increases)
//      Cash In Hand A/c Cr (cash on hand decreases)
//
//    CASH_WITHDRAWAL (cash comes out of bank):
//      Cash In Hand A/c Dr (cash on hand increases)
//      Bank A/c Cr         (bank balance decreases)
// ---------------------------------------------------------------------------
const confirmBankSlip = async (id, companyId, workspaceId, userId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bankSlip = await mongoose
      .model("BankSlip")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!bankSlip) throw new ApiError(404, "Bank Slip not found");
    if (bankSlip.status !== BANK_SLIP_STATUS.SUBMITTED) {
      throw new ApiError(
        400,
        `Slip can only be confirmed from SUBMITTED status. Current: ${bankSlip.status}`,
      );
    }

    // Get bank ledger account
    const bankAccount = await BankAccount.findOne({
      _id: bankSlip.bankAccountId,
    }).session(session);
    if (!bankAccount) throw new ApiError(400, "Linked bank account not found");

    const bankLedgerAccountId = bankAccount.ledgerAccountId;

    // Get Cash In Hand account
    const cashInHandAccount = await findOrCreateCashInHandAccount(
      bankSlip.workspaceId,
      companyId,
      userId,
      session,
    );

    const confirmNarration =
      payload?.narration ||
      `${bankSlip.slipType === BANK_SLIP_TYPE.CASH_DEPOSIT ? "Cash Deposit" : "Cash Withdrawal"} - Slip #${bankSlip.slipNumber}`;

    // Build journal lines
    let lines;
    if (bankSlip.slipType === BANK_SLIP_TYPE.CASH_DEPOSIT) {
      lines = [
        {
          accountId: bankLedgerAccountId,
          debit: bankSlip.amount,
          credit: 0,
          narration: confirmNarration,
        },
        {
          accountId: cashInHandAccount._id,
          debit: 0,
          credit: bankSlip.amount,
          narration: confirmNarration,
        },
      ];
    } else {
      lines = [
        {
          accountId: cashInHandAccount._id,
          debit: bankSlip.amount,
          credit: 0,
          narration: confirmNarration,
        },
        {
          accountId: bankLedgerAccountId,
          debit: 0,
          credit: bankSlip.amount,
          narration: confirmNarration,
        },
      ];
    }

    // Generate journal voucher number
    const voucherNumber = await voucherNumberService.generateVoucherNumber(
      companyId,
      bankSlip.workspaceId,
      VOUCHER_TYPE.JOURNAL,
      { session },
    );

    // Create voucher
    const journalVoucher = await journalVoucherRepository.createVoucher(
      {
        workspaceId: bankSlip.workspaceId,
        companyId,
        voucherNumber,
        voucherDate: new Date(payload?.confirmDate || bankSlip.slipDate),
        voucherType: VOUCHER_TYPE.JOURNAL,
        referenceNumber: bankSlip.bankSlipReference || bankSlip.slipNumber,
        narration: confirmNarration,
        totalDebit: bankSlip.amount,
        totalCredit: bankSlip.amount,
        createdBy: userId,
      },
      { session },
    );

    // Save lines
    const linesWithVoucher = lines.map((l) => ({
      ...l,
      workspaceId: bankSlip.workspaceId,
      companyId,
      voucherId: journalVoucher._id,
    }));
    await journalLineRepository.createLines(linesWithVoucher, { session });

    // Post the voucher
    await journalPostingService.postJournalVoucher(
      journalVoucher._id,
      companyId,
      bankSlip.workspaceId,
      userId,
      { session },
    );

    // Update slip
    bankSlip.status = BANK_SLIP_STATUS.CONFIRMED;
    bankSlip.confirmedAt = new Date();
    bankSlip.confirmedBy = userId;
    bankSlip.journalVoucherId = journalVoucher._id;
    await bankSlip.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getBankSlipById(bankSlip._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 4. REJECT SLIP (SUBMITTED → REJECTED)
//    Bank rejected the slip. No journal entry needed (nothing was posted).
// ---------------------------------------------------------------------------
const rejectBankSlip = async (id, companyId, workspaceId, userId, payload) => {
  const bankSlip = await mongoose
    .model("BankSlip")
    .findOne({ _id: id, companyId, workspaceId, isDeleted: false });

  if (!bankSlip) throw new ApiError(404, "Bank Slip not found");
  if (bankSlip.status !== BANK_SLIP_STATUS.SUBMITTED) {
    throw new ApiError(
      400,
      `Slip can only be rejected from SUBMITTED status. Current: ${bankSlip.status}`,
    );
  }

  bankSlip.status = BANK_SLIP_STATUS.REJECTED;
  bankSlip.rejectedAt = new Date();
  bankSlip.rejectedBy = userId;
  bankSlip.rejectionReason = payload?.reason || null;
  await bankSlip.save();

  return getBankSlipById(bankSlip._id, companyId, workspaceId);
};

// ---------------------------------------------------------------------------
// 5. CANCEL SLIP (PENDING → CANCELLED)
//    Voided before even submitting. No journal reversal needed.
// ---------------------------------------------------------------------------
const cancelBankSlip = async (id, companyId, workspaceId, userId, payload) => {
  const bankSlip = await mongoose
    .model("BankSlip")
    .findOne({ _id: id, companyId, workspaceId, isDeleted: false });

  if (!bankSlip) throw new ApiError(404, "Bank Slip not found");
  if (bankSlip.status !== BANK_SLIP_STATUS.PENDING) {
    throw new ApiError(
      400,
      `Only PENDING slips can be cancelled. Current: ${bankSlip.status}`,
    );
  }

  bankSlip.status = BANK_SLIP_STATUS.CANCELLED;
  bankSlip.cancelledAt = new Date();
  bankSlip.cancelledBy = userId;
  bankSlip.cancellationReason = payload?.reason || null;
  await bankSlip.save();

  return getBankSlipById(bankSlip._id, companyId, workspaceId);
};

// ---------------------------------------------------------------------------
// GET BANK SLIPS (LIST)
// ---------------------------------------------------------------------------
const getBankSlips = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await bankSlipRepository.getBankSlips(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    bankSlips: result.bankSlips.map((s) => s.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ---------------------------------------------------------------------------
// GET BANK SLIP BY ID
// ---------------------------------------------------------------------------
const getBankSlipById = async (id, companyId, workspaceId) => {
  const bankSlip = await bankSlipRepository.findBankSlipByIdCompanyAndWorkspace(
    id,
    companyId,
    workspaceId,
  );
  if (!bankSlip) throw new ApiError(404, "Bank Slip not found");
  return bankSlip.toSafeObject();
};

export default {
  createBankSlip,
  submitBankSlip,
  confirmBankSlip,
  rejectBankSlip,
  cancelBankSlip,
  getBankSlips,
  getBankSlipById,
};
