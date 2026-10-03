import mongoose from "mongoose";
import ApiError from "../../../../utils/ApiError.js";
import Customer from "../../../parties/customers/models/customer.model.js";
import Supplier from "../../../parties/suppliers/models/supplier.model.js";
import accountRepository from "../../chart-of-accounts/repositories/account.repository.js";
import accountGroupRepository from "../../chart-of-accounts/repositories/accountGroup.repository.js";
import journalVoucherRepository from "../../journal-vouchers/repositories/journalVoucher.repository.js";
import journalLineRepository from "../../journal-vouchers/repositories/journalLine.repository.js";
import voucherNumberService from "../../journal-vouchers/services/voucherNumber.service.js";
import journalPostingService from "../../journal-vouchers/services/journalPosting.service.js";
import { VOUCHER_TYPE } from "../../journal-vouchers/constants/voucherType.constant.js";
import { VOUCHER_STATUS } from "../../journal-vouchers/constants/voucherStatus.constant.js";
import BankAccount from "../../treasury/bank-management/bank-accounts/models/bankAccount.model.js";

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
  balanceType,
  options = {}
) => {
  const session = options.session;

  // 1. Get or create offsetting equity account
  const obEquityAccount = await getOrCreateOpeningBalanceEquityAccount(
    workspaceId,
    companyId,
    userId,
    { session }
  );

  // 2. Generate unique voucher number
  const voucherNumber = await voucherNumberService.generateVoucherNumber(
    companyId,
    workspaceId,
    VOUCHER_TYPE.OPENING_BALANCE,
    { session }
  );

  // 3. Create Journal Voucher header
  const voucherPayload = {
    workspaceId,
    companyId,
    voucherNumber,
    voucherDate: new Date(),
    voucherType: VOUCHER_TYPE.OPENING_BALANCE,
    referenceNumber: `OP-${accountId.toString().slice(-6)}`,
    narration: `Opening balance initialization`,
    totalDebit: amount,
    totalCredit: amount,
    status: VOUCHER_STATUS.DRAFT,
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

  return postedVoucher;
};

const setAccountOpeningBalance = async (
  workspaceId,
  companyId,
  userId,
  payload
) => {
  const { accountId, amount, balanceType } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
      accountId,
      companyId,
      workspaceId,
      { session }
    );

    if (!account) {
      throw new ApiError(404, "Account not found");
    }

    // Set fields
    account.openingBalance = amount;
    account.openingBalanceType = balanceType;
    await account.save({ session });

    let postedVoucher = null;
    if (amount > 0) {
      postedVoucher = await postOpeningBalanceJournal(
        workspaceId,
        companyId,
        userId,
        accountId,
        amount,
        balanceType,
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      account: account.toSafeObject(),
      voucher: postedVoucher,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const setCustomerOpeningBalance = async (
  workspaceId,
  companyId,
  userId,
  payload
) => {
  const { customerId, amount, balanceType } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customer = await Customer.findOne({
      _id: customerId,
      companyId,
      workspaceId,
      isDeleted: false,
    }).session(session);

    if (!customer) {
      throw new ApiError(404, "Customer not found");
    }

    if (!customer.ledgerAccountId) {
      throw new ApiError(400, "Customer does not have a linked ledger account");
    }

    // Update Customer details
    customer.openingBalance = amount;
    customer.openingBalanceType = balanceType;
    await customer.save({ session });

    // Update linked Account details
    const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
      customer.ledgerAccountId,
      companyId,
      workspaceId,
      { session }
    );
    if (account) {
      account.openingBalance = amount;
      account.openingBalanceType = balanceType;
      await account.save({ session });
    }

    let postedVoucher = null;
    if (amount > 0) {
      postedVoucher = await postOpeningBalanceJournal(
        workspaceId,
        companyId,
        userId,
        customer.ledgerAccountId,
        amount,
        balanceType,
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      customer: customer.toSafeObject(),
      voucher: postedVoucher,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const setSupplierOpeningBalance = async (
  workspaceId,
  companyId,
  userId,
  payload
) => {
  const { supplierId, amount, balanceType } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const supplier = await Supplier.findOne({
      _id: supplierId,
      companyId,
      workspaceId,
      isDeleted: false,
    }).session(session);

    if (!supplier) {
      throw new ApiError(404, "Supplier not found");
    }

    if (!supplier.ledgerAccountId) {
      throw new ApiError(400, "Supplier does not have a linked ledger account");
    }

    // Update Supplier details
    supplier.openingBalance = amount;
    supplier.openingBalanceType = balanceType;
    await supplier.save({ session });

    // Update linked Account details
    const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
      supplier.ledgerAccountId,
      companyId,
      workspaceId,
      { session }
    );
    if (account) {
      account.openingBalance = amount;
      account.openingBalanceType = balanceType;
      await account.save({ session });
    }

    let postedVoucher = null;
    if (amount > 0) {
      postedVoucher = await postOpeningBalanceJournal(
        workspaceId,
        companyId,
        userId,
        supplier.ledgerAccountId,
        amount,
        balanceType,
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      supplier: supplier.toSafeObject(),
      voucher: postedVoucher,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const setBankAccountOpeningBalance = async (
  workspaceId,
  companyId,
  userId,
  payload
) => {
  const { bankAccountId, amount, balanceType } = payload;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bankAccount = await BankAccount.findOne({
      _id: bankAccountId,
      companyId,
      workspaceId,
      isDeleted: false,
    }).session(session);

    if (!bankAccount) {
      throw new ApiError(404, "Bank Account not found");
    }

    if (!bankAccount.ledgerAccountId) {
      throw new ApiError(400, "Bank Account does not have a linked ledger account");
    }

    // Update linked Account opening balance fields
    const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
      bankAccount.ledgerAccountId,
      companyId,
      workspaceId,
      { session }
    );
    if (account) {
      account.openingBalance = amount;
      account.openingBalanceType = balanceType;
      await account.save({ session });
    }

    let postedVoucher = null;
    if (amount > 0) {
      postedVoucher = await postOpeningBalanceJournal(
        workspaceId,
        companyId,
        userId,
        bankAccount.ledgerAccountId,
        amount,
        balanceType,
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    return {
      bankAccountId,
      ledgerAccountId: bankAccount.ledgerAccountId,
      voucher: postedVoucher,
    };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};


export default {
  postOpeningBalanceJournal,
  setAccountOpeningBalance,
  setCustomerOpeningBalance,
  setSupplierOpeningBalance,
  setBankAccountOpeningBalance,
};
