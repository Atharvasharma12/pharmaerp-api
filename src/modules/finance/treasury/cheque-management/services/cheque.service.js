import mongoose from "mongoose";
import ApiError from "../../../../../utils/ApiError.js";
import chequeRepository from "../repositories/cheque.repository.js";
import { CHEQUE_TYPE, CHEQUE_STATUS } from "../constants/cheque.constant.js";

import BankAccount from "../../bank-management/bank-accounts/models/bankAccount.model.js";
import Account from "../../../chart-of-accounts/models/account.model.js";
import accountGroupRepository from "../../../chart-of-accounts/repositories/accountGroup.repository.js";
import accountRepository from "../../../chart-of-accounts/repositories/account.repository.js";
import journalVoucherRepository from "../../../journal-vouchers/repositories/journalVoucher.repository.js";
import journalLineRepository from "../../../journal-vouchers/repositories/journalLine.repository.js";
import journalPostingService from "../../../journal-vouchers/services/journalPosting.service.js";
import journalCancellationService from "../../../journal-vouchers/services/journalCancellation.service.js";
import { VOUCHER_TYPE } from "../../../journal-vouchers/constants/voucherType.constant.js";
import voucherNumberService from "../../../journal-vouchers/services/voucherNumber.service.js";

// ---------------------------------------------------------------------------
// HELPER — find or auto-create a system account (e.g. Cheques In Transit,
//           Bounce Charges Expense)
// ---------------------------------------------------------------------------
const findOrCreateSystemAccount = async (
  workspaceId,
  companyId,
  userId,
  accountCode,
  accountName,
  accountNature,
  accountCategory,
  groupCode,
  groupName,
  session,
) => {
  let account = await accountRepository.findAccountByCode(companyId, accountCode, { session });
  if (account) return account;

  let group = await accountGroupRepository.findGroupByCode(companyId, groupCode, { session });
  if (!group) {
    group = await accountGroupRepository.createGroup(
      {
        workspaceId,
        companyId,
        groupCode,
        groupName,
        parentGroupId: null,
        nature: accountNature,
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
      accountCode,
      accountName,
      accountGroupId: group._id,
      accountNature,
      accountCategory,
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
// HELPER — create + post a journal voucher
// ---------------------------------------------------------------------------
const createAndPostVoucher = async (
  workspaceId,
  companyId,
  userId,
  voucherDate,
  narration,
  referenceNumber,
  lines,       // [{ accountId, debit, credit, narration }]
  session,
) => {
  const voucherNumber = await voucherNumberService.generateVoucherNumber(
    companyId,
    workspaceId,
    VOUCHER_TYPE.JOURNAL,
    { session },
  );

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

  const voucher = await journalVoucherRepository.createVoucher(
    {
      workspaceId,
      companyId,
      voucherNumber,
      voucherDate: new Date(voucherDate),
      voucherType: VOUCHER_TYPE.JOURNAL,
      referenceNumber: referenceNumber || null,
      narration,
      totalDebit,
      totalCredit,
      createdBy: userId,
    },
    { session },
  );

  const linesWithVoucher = lines.map((l) => ({
    ...l,
    workspaceId,
    companyId,
    voucherId: voucher._id,
  }));
  await journalLineRepository.createLines(linesWithVoucher, { session });

  await journalPostingService.postJournalVoucher(
    voucher._id,
    companyId,
    workspaceId,
    userId,
    { session },
  );

  return voucher;
};

// ---------------------------------------------------------------------------
// 1. CREATE CHEQUE (Status: PENDING)
//
// Accounting on creation:
//   RECEIVED cheque:
//     Cheques In Transit A/c Dr   (asset — we hold the cheque)
//     Counterparty A/c Cr         (reduces what the party owes us)
//
//   ISSUED cheque:
//     Counterparty A/c Dr         (reduces what we owe the party)
//     Cheques In Transit A/c Cr   (liability — we have issued a cheque)
// ---------------------------------------------------------------------------
const createCheque = async (workspaceId, companyId, userId, payload) => {
  const {
    chequeType,
    chequeNumber,
    chequeDate,
    bankAccountId,
    counterpartyAccountId,
    partyName,
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
    if (!bankAccount) throw new ApiError(400, "Bank Account not found");

    // 2. Verify counterparty account
    const counterpartyAccount = await Account.findOne({
      _id: counterpartyAccountId,
      companyId,
      isDeleted: false,
    }).session(session);
    if (!counterpartyAccount) throw new ApiError(400, "Counterparty account not found");

    // 3. Duplicate cheque number check (same type, same company)
    const duplicate = await chequeRepository.findChequeByNumber(
      companyId,
      chequeNumber,
      chequeType,
      { session },
    );
    if (duplicate) {
      throw new ApiError(
        400,
        `A ${chequeType} cheque with number ${chequeNumber} already exists`,
      );
    }

    // 4. Get or create "Cheques In Transit" clearing account
    const chequeInTransit = await findOrCreateSystemAccount(
      workspaceId, companyId, userId,
      "CHEQ_IN_TRANSIT", "Cheques In Transit",
      "ASSET", "CASH",
      "CHEQ_IN_TRANSIT_GRP", "Cheques In Transit",
      session,
    );

    const txNarration = narration || `${chequeType} Cheque #${chequeNumber} - ${partyName}`;

    // 5. Build journal lines based on cheque type
    let lines;
    if (chequeType === CHEQUE_TYPE.RECEIVED) {
      // We received a cheque from the party → Cheques In Transit Dr, Party Cr
      lines = [
        { accountId: chequeInTransit._id, debit: amount, credit: 0, narration: txNarration },
        { accountId: counterpartyAccountId, debit: 0, credit: amount, narration: txNarration },
      ];
    } else {
      // We issued a cheque to the party → Party Dr, Cheques In Transit Cr
      lines = [
        { accountId: counterpartyAccountId, debit: amount, credit: 0, narration: txNarration },
        { accountId: chequeInTransit._id, debit: 0, credit: amount, narration: txNarration },
      ];
    }

    // 6. Create + post the pending voucher
    const pendingVoucher = await createAndPostVoucher(
      workspaceId, companyId, userId,
      chequeDate, txNarration, chequeNumber, lines, session,
    );

    // 7. Save the cheque record
    const cheque = await chequeRepository.createCheque(
      {
        workspaceId,
        companyId,
        chequeType,
        chequeNumber: String(chequeNumber).trim().toUpperCase(),
        chequeDate: new Date(chequeDate),
        bankAccountId,
        counterpartyAccountId,
        partyName: String(partyName).trim(),
        amount,
        narration: narration || null,
        status: CHEQUE_STATUS.PENDING,
        pendingJournalVoucherId: pendingVoucher._id,
        createdBy: userId,
      },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return getChequeById(cheque._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 2. DEPOSIT CHEQUE (PENDING → DEPOSITED)
//
// No new journal entry needed — the cheque is now physically in the bank
// but not yet cleared. We just update the status.
// ---------------------------------------------------------------------------
const depositCheque = async (id, companyId, workspaceId, userId) => {
  const cheque = await mongoose
    .model("Cheque")
    .findOne({ _id: id, companyId, workspaceId, isDeleted: false });

  if (!cheque) throw new ApiError(404, "Cheque not found");
  if (cheque.status !== CHEQUE_STATUS.PENDING) {
    throw new ApiError(400, `Cheque cannot be deposited from status: ${cheque.status}`);
  }

  cheque.status = CHEQUE_STATUS.DEPOSITED;
  cheque.depositedAt = new Date();
  cheque.depositedBy = userId;
  await cheque.save();

  return getChequeById(cheque._id, companyId, workspaceId);
};

// ---------------------------------------------------------------------------
// 3. CLEAR CHEQUE (DEPOSITED → CLEARED)
//
// Accounting on clearing:
//   RECEIVED cheque (money arrives in our bank):
//     Bank A/c Dr                 (actual bank balance increases)
//     Cheques In Transit A/c Cr   (clears the transit asset)
//
//   ISSUED cheque (money leaves our bank):
//     Cheques In Transit A/c Dr   (clears the transit liability)
//     Bank A/c Cr                 (actual bank balance decreases)
// ---------------------------------------------------------------------------
const clearCheque = async (id, companyId, workspaceId, userId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cheque = await mongoose
      .model("Cheque")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!cheque) throw new ApiError(404, "Cheque not found");
    const allowedStatus = cheque.chequeType === CHEQUE_TYPE.ISSUED
      ? [CHEQUE_STATUS.PENDING]
      : [CHEQUE_STATUS.DEPOSITED];

    if (!allowedStatus.includes(cheque.status)) {
      throw new ApiError(
        400,
        `Cheque cannot be cleared from status: ${cheque.status} for ${cheque.chequeType} cheque`,
      );
    }

    // Get the bank ledger account
    const bankAccount = await BankAccount.findOne({ _id: cheque.bankAccountId }).session(session);
    if (!bankAccount) throw new ApiError(400, "Bank Account not found");
    const bankLedgerAccountId = bankAccount.ledgerAccountId;

    // Get Cheques In Transit account
    const chequeInTransit = await findOrCreateSystemAccount(
      workspaceId, companyId, userId,
      "CHEQ_IN_TRANSIT", "Cheques In Transit",
      "ASSET", "CASH",
      "CHEQ_IN_TRANSIT_GRP", "Cheques In Transit",
      session,
    );

    const clearNarration =
      payload?.narration ||
      `Cheque #${cheque.chequeNumber} Cleared - ${cheque.partyName}`;

    let lines;
    if (cheque.chequeType === CHEQUE_TYPE.RECEIVED) {
      // Money received into bank
      lines = [
        { accountId: bankLedgerAccountId, debit: cheque.amount, credit: 0, narration: clearNarration },
        { accountId: chequeInTransit._id, debit: 0, credit: cheque.amount, narration: clearNarration },
      ];
    } else {
      // Money paid out of bank
      lines = [
        { accountId: chequeInTransit._id, debit: cheque.amount, credit: 0, narration: clearNarration },
        { accountId: bankLedgerAccountId, debit: 0, credit: cheque.amount, narration: clearNarration },
      ];
    }

    const clearingVoucher = await createAndPostVoucher(
      workspaceId, companyId, userId,
      payload?.clearDate || new Date(), clearNarration, cheque.chequeNumber, lines, session,
    );

    cheque.status = CHEQUE_STATUS.CLEARED;
    cheque.clearedAt = new Date();
    cheque.clearedBy = userId;
    cheque.clearingJournalVoucherId = clearingVoucher._id;
    await cheque.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getChequeById(cheque._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 4. BOUNCE CHEQUE (PENDING or DEPOSITED → BOUNCED)
//
// Accounting on bounce:
//   Reverse the original pending journal entry, then:
//
//   RECEIVED cheque (customer's cheque bounced):
//     Counterparty A/c Dr          (party owes us again)
//     Cheques In Transit A/c Cr    (cancel the transit asset)
//     Bounce Charges Expense Dr    (if bounceCharges > 0)
//     Bank A/c Cr                  (bank deducts bounce fee)
//
//   ISSUED cheque (our cheque was returned by vendor):
//     Cheques In Transit A/c Dr    (cancel the transit liability)
//     Counterparty A/c Cr          (we owe the vendor again)
// ---------------------------------------------------------------------------
const bounceCheque = async (id, companyId, workspaceId, userId, payload) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const cheque = await mongoose
      .model("Cheque")
      .findOne({ _id: id, companyId, workspaceId, isDeleted: false })
      .session(session);

    if (!cheque) throw new ApiError(404, "Cheque not found");
    if (![CHEQUE_STATUS.PENDING, CHEQUE_STATUS.DEPOSITED].includes(cheque.status)) {
      throw new ApiError(400, `Cheque cannot be bounced from status: ${cheque.status}`);
    }

    const bounceReason = payload?.reason || "Cheque returned/dishonoured";
    const bounceCharges = Number(payload?.bounceCharges) || 0;

    // Get Cheques In Transit account
    const chequeInTransit = await findOrCreateSystemAccount(
      workspaceId, companyId, userId,
      "CHEQ_IN_TRANSIT", "Cheques In Transit",
      "ASSET", "CASH",
      "CHEQ_IN_TRANSIT_GRP", "Cheques In Transit",
      session,
    );

    const bounceNarration =
      `Cheque #${cheque.chequeNumber} Bounced - ${cheque.partyName} - ${bounceReason}`;

    let lines;
    if (cheque.chequeType === CHEQUE_TYPE.RECEIVED) {
      // Reverse: party owes us again, transit asset gone
      lines = [
        { accountId: cheque.counterpartyAccountId, debit: cheque.amount, credit: 0, narration: bounceNarration },
        { accountId: chequeInTransit._id, debit: 0, credit: cheque.amount, narration: bounceNarration },
      ];

      // Add bounce charges if applicable
      if (bounceCharges > 0) {
        const bankAccount = await BankAccount.findOne({ _id: cheque.bankAccountId }).session(session);
        const bankLedgerAccountId = bankAccount.ledgerAccountId;

        const bounceChargesAccount = await findOrCreateSystemAccount(
          workspaceId, companyId, userId,
          "BOUNCE_CHARGES", "Cheque Bounce Charges",
          "EXPENSE", "EXPENSE",
          "BOUNCE_CHARGES_GRP", "Bank Charges",
          session,
        );

        lines.push(
          { accountId: bounceChargesAccount._id, debit: bounceCharges, credit: 0, narration: bounceNarration },
          { accountId: bankLedgerAccountId, debit: 0, credit: bounceCharges, narration: bounceNarration },
        );
      }
    } else {
      // Issued cheque returned: cancel transit liability, re-credit vendor
      lines = [
        { accountId: chequeInTransit._id, debit: cheque.amount, credit: 0, narration: bounceNarration },
        { accountId: cheque.counterpartyAccountId, debit: 0, credit: cheque.amount, narration: bounceNarration },
      ];
    }

    const bounceVoucher = await createAndPostVoucher(
      workspaceId, companyId, userId,
      new Date(), bounceNarration, cheque.chequeNumber, lines, session,
    );

    cheque.status = CHEQUE_STATUS.BOUNCED;
    cheque.bouncedAt = new Date();
    cheque.bouncedBy = userId;
    cheque.bounceReason = bounceReason;
    cheque.bounceCharges = bounceCharges;
    cheque.bounceJournalVoucherId = bounceVoucher._id;
    await cheque.save({ session });

    await session.commitTransaction();
    session.endSession();

    return getChequeById(cheque._id, companyId, workspaceId);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

// ---------------------------------------------------------------------------
// 5. CANCEL CHEQUE (PENDING → CANCELLED)
//    Reverses the pending journal entry via journalCancellationService
// ---------------------------------------------------------------------------
const cancelCheque = async (id, companyId, workspaceId, userId, payload) => {
  const cheque = await mongoose
    .model("Cheque")
    .findOne({ _id: id, companyId, workspaceId, isDeleted: false });

  if (!cheque) throw new ApiError(404, "Cheque not found");
  if (cheque.status !== CHEQUE_STATUS.PENDING) {
    throw new ApiError(400, `Only PENDING cheques can be cancelled. Current status: ${cheque.status}`);
  }

  // Reverse the pending journal entry
  if (cheque.pendingJournalVoucherId) {
    await journalCancellationService.cancelJournalVoucher(
      cheque.pendingJournalVoucherId,
      companyId,
      workspaceId,
      userId,
    );
  }

  cheque.status = CHEQUE_STATUS.CANCELLED;
  cheque.cancelledAt = new Date();
  cheque.cancelledBy = userId;
  cheque.cancellationReason = payload?.reason || null;
  await cheque.save();

  return getChequeById(cheque._id, companyId, workspaceId);
};

// ---------------------------------------------------------------------------
// GET CHEQUES (LIST)
// ---------------------------------------------------------------------------
const getCheques = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await chequeRepository.getCheques(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    cheques: result.cheques.map((c) => c.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

// ---------------------------------------------------------------------------
// GET CHEQUE BY ID
// ---------------------------------------------------------------------------
const getChequeById = async (id, companyId, workspaceId) => {
  const cheque = await chequeRepository.findChequeByIdCompanyAndWorkspace(
    id,
    companyId,
    workspaceId,
  );
  if (!cheque) throw new ApiError(404, "Cheque not found");
  return cheque.toSafeObject();
};

export default {
  createCheque,
  depositCheque,
  clearCheque,
  bounceCheque,
  cancelCheque,
  getCheques,
  getChequeById,
};
