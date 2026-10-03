import AccountGroup from "../models/accountGroup.model.js";
import Account from "../models/account.model.js";
import { DEFAULT_GROUPS, DEFAULT_ACCOUNTS } from "../constants/defaultCOATemplate.constant.js";

const seedCompanyChartOfAccounts = async (workspaceId, companyId, userId, options = {}) => {
  const session = options.session || null;

  // Prevent duplicate seeding if groups already exist for this company
  const existingCount = await AccountGroup.countDocuments({
    companyId,
    isDeleted: false,
  }).session(session);

  if (existingCount > 0) {
    return;
  }

  const createdGroupsMap = new Map();

  // 1. Create root groups (without parentGroupCode)
  const rootGroupsPayload = DEFAULT_GROUPS.filter((g) => !g.parentGroupCode).map((g) => ({
    workspaceId,
    companyId,
    groupCode: g.groupCode,
    groupName: g.groupName,
    nature: g.nature,
    parentGroupId: null,
    isSystemGroup: true,
    createdBy: userId,
  }));

  const rootGroups = await AccountGroup.insertMany(rootGroupsPayload, { session });
  rootGroups.forEach((rg) => {
    createdGroupsMap.set(rg.groupCode, rg._id);
  });

  // 2. Create sub groups (with parentGroupCode)
  const subGroupsPayload = DEFAULT_GROUPS.filter((g) => !!g.parentGroupCode).map((g) => {
    const parentGroupId = createdGroupsMap.get(g.parentGroupCode);
    return {
      workspaceId,
      companyId,
      groupCode: g.groupCode,
      groupName: g.groupName,
      nature: g.nature,
      parentGroupId: parentGroupId || null,
      isSystemGroup: true,
      createdBy: userId,
    };
  });

  if (subGroupsPayload.length > 0) {
    const subGroups = await AccountGroup.insertMany(subGroupsPayload, { session });
    subGroups.forEach((sg) => {
      createdGroupsMap.set(sg.groupCode, sg._id);
    });
  }

  // 3. Create default accounts
  const accountsPayload = DEFAULT_ACCOUNTS.map((a) => {
    const groupId = createdGroupsMap.get(a.groupCode);
    const parentGroup = DEFAULT_GROUPS.find((g) => g.groupCode === a.groupCode);
    const nature = parentGroup ? parentGroup.nature : "ASSET";

    return {
      workspaceId,
      companyId,
      accountCode: a.accountCode,
      accountName: a.accountName,
      accountGroupId: groupId || null,
      accountNature: nature,
      accountCategory: a.category,
      openingBalance: 0,
      openingBalanceType: a.openingBalanceType || "dr",
      status: "active",
      isSystemAccount: true,
      createdBy: userId,
    };
  });

  await Account.insertMany(accountsPayload, { session });
};

export default {
  seedCompanyChartOfAccounts,
};
