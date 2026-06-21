import ApiError from "../../../../utils/ApiError.js";
import accountRepository from "../repositories/account.repository.js";
import accountGroupRepository from "../repositories/accountGroup.repository.js";
import { ACCOUNT_STATUS } from "../constants/account.constant.js";

import Customer from "../../../parties/customers/models/customer.model.js";
import Supplier from "../../../parties/suppliers/models/supplier.model.js";

const createAccount = async (workspaceId, companyId, userId, payload) => {
  const {
    accountCode,
    accountName,
    accountGroupId,
    accountCategory,
    openingBalance,
    openingBalanceType,
    status,
  } = payload;

  // Check unique code
  const existingCode = await accountRepository.findAccountByCode(
    companyId,
    accountCode,
  );
  if (existingCode) {
    throw new ApiError(
      400,
      "Account with this code already exists in the company",
    );
  }

  // Check unique name
  const existingName = await accountRepository.findAccountByName(
    companyId,
    accountName,
  );
  if (existingName) {
    throw new ApiError(
      400,
      "Account with this name already exists in the company",
    );
  }

  // Validate parent account group
  const group = await accountGroupRepository.findGroupByIdCompanyAndWorkspace(
    accountGroupId,
    companyId,
    workspaceId,
  );
  if (!group) {
    throw new ApiError(404, "Account Group not found under this company");
  }

  // Resolve nature dynamically from parent group
  const accountNature = group.nature;

  const account = await accountRepository.createAccount({
    workspaceId,
    companyId,
    accountCode,
    accountName,
    accountGroupId,
    accountNature,
    accountCategory,
    openingBalance,
    openingBalanceType,
    status,
    isSystemAccount: false,
    createdBy: userId,
  });

  return account.toSafeObject();
};

const getAccounts = async (workspaceId, companyId, query = {}) => {
  const { page, limit, sort, all, ...filters } = query;
  const result = await accountRepository.getAccounts(
    workspaceId,
    companyId,
    filters,
    { page, limit, sort, all: all === "true" || all === true },
  );

  return {
    accounts: result.accounts.map((a) => a.toSafeObject()),
    total: result.total,
    page: result.page,
    limit: result.limit,
  };
};

const getAccountById = async (accountId, companyId, workspaceId) => {
  const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
    accountId,
    companyId,
    workspaceId,
  );

  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  return account.toSafeObject();
};

const updateAccount = async (
  accountId,
  companyId,
  workspaceId,
  userId,
  payload,
) => {
  const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
    accountId,
    companyId,
    workspaceId,
  );

  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  if (account.isSystemAccount) {
    throw new ApiError(400, "System accounts cannot be modified");
  }

  // Unique name check
  if (payload.accountName && payload.accountName !== account.accountName) {
    const existingName = await accountRepository.findAccountByName(
      companyId,
      payload.accountName,
    );
    if (
      existingName &&
      existingName._id.toString() !== account._id.toString()
    ) {
      throw new ApiError(
        400,
        "Account with this name already exists in the company",
      );
    }
  }

  // Group change check
  if (payload.accountGroupId) {
    const group = await accountGroupRepository.findGroupByIdCompanyAndWorkspace(
      payload.accountGroupId,
      companyId,
      workspaceId,
    );
    if (!group) {
      throw new ApiError(404, "Account Group not found under this company");
    }
    account.accountNature = group.nature;
  }

  const allowedFields = [
    "accountName",
    "accountGroupId",
    "openingBalance",
    "openingBalanceType",
    "status",
  ];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      account[field] = payload[field];
    }
  });

  await accountRepository.saveAccount(account);

  return account.toSafeObject();
};

const deleteAccount = async (accountId, companyId, workspaceId, userId) => {
  const account = await accountRepository.findAccountByIdCompanyAndWorkspace(
    accountId,
    companyId,
    workspaceId,
  );

  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  if (account.isSystemAccount) {
    throw new ApiError(400, "System accounts cannot be deleted");
  }

  // Check if linked to active customers
  const isLinkedToCustomer = await Customer.exists({
    ledgerAccountId: accountId,
    isDeleted: false,
  });
  if (isLinkedToCustomer) {
    throw new ApiError(
      400,
      "Cannot delete account because it is linked to an active customer ledger",
    );
  }

  // Check if linked to active suppliers
  const isLinkedToSupplier = await Supplier.exists({
    ledgerAccountId: accountId,
    isDeleted: false,
  });
  if (isLinkedToSupplier) {
    throw new ApiError(
      400,
      "Cannot delete account because it is linked to an active supplier ledger",
    );
  }

  await accountRepository.deleteAccountById(
    accountId,
    companyId,
    workspaceId,
    userId,
  );

  return { success: true };
};

export default {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
};
