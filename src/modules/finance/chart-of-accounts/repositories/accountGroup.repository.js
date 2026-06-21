import mongoose from "mongoose";
import AccountGroup from "../models/accountGroup.model.js";
import { ACCOUNT_GROUP_STATUS } from "../constants/accountGroup.constant.js";

const findGroupById = async (groupId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    return null;
  }
  return AccountGroup.findOne({
    _id: groupId,
    isDeleted: false,
  }).select(options.select || "");
};

const findGroupByIdCompanyAndWorkspace = async (
  groupId,
  companyId,
  workspaceId,
  options = {}
) => {
  if (
    !mongoose.Types.ObjectId.isValid(groupId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return AccountGroup.findOne({
    _id: groupId,
    companyId,
    workspaceId,
    isDeleted: false,
  })
    .populate("parentGroupId", "groupName groupCode")
    .select(options.select || "");
};

const findGroupByCode = async (companyId, groupCode, options = {}) => {
  if (!groupCode || !mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }
  return AccountGroup.findOne({
    companyId,
    groupCode: String(groupCode).trim().toUpperCase(),
    isDeleted: false,
  }).select(options.select || "");
};

const findGroupByName = async (companyId, groupName, options = {}) => {
  if (!groupName || !mongoose.Types.ObjectId.isValid(companyId)) {
    return null;
  }
  return AccountGroup.findOne({
    companyId,
    groupName: String(groupName).trim(),
    isDeleted: false,
  }).select(options.select || "");
};

const createGroup = async (payload) => {
  return AccountGroup.create(payload);
};

const saveGroup = async (group) => {
  return group.save();
};

const getGroups = async (workspaceId, companyId, filters = {}, options = {}) => {
  if (
    !mongoose.Types.ObjectId.isValid(workspaceId) ||
    !mongoose.Types.ObjectId.isValid(companyId)
  ) {
    return { groups: [], total: 0, page: 1, limit: 20 };
  }

  const query = {
    workspaceId,
    companyId,
    isDeleted: false,
  };

  if (filters.nature) {
    query.nature = filters.nature;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.parentGroupId !== undefined) {
    query.parentGroupId = filters.parentGroupId;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), "i");
    query.$or = [
      { groupName: searchRegex },
      { groupCode: searchRegex },
    ];
  }

  const sort = options.sort || { groupName: 1 };

  if (options.all === true) {
    const groups = await AccountGroup.find(query)
      .populate("parentGroupId", "groupName groupCode")
      .sort(sort)
      .select(options.select || "");
    return { groups, total: groups.length };
  }

  const page = Math.max(1, parseInt(options.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 20));
  const skip = (page - 1) * limit;

  const [groups, total] = await Promise.all([
    AccountGroup.find(query)
      .populate("parentGroupId", "groupName groupCode")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select(options.select || ""),
    AccountGroup.countDocuments(query),
  ]);

  return { groups, total, page, limit };
};

const deleteGroupById = async (groupId, companyId, workspaceId, deletedBy) => {
  if (
    !mongoose.Types.ObjectId.isValid(groupId) ||
    !mongoose.Types.ObjectId.isValid(companyId) ||
    !mongoose.Types.ObjectId.isValid(workspaceId)
  ) {
    return null;
  }

  return AccountGroup.findOneAndUpdate(
    {
      _id: groupId,
      companyId,
      workspaceId,
      isDeleted: false,
      isSystemGroup: false,
    },
    {
      isDeleted: true,
      status: ACCOUNT_GROUP_STATUS.INACTIVE,
      deletedAt: new Date(),
      deletedBy,
    },
    {
      new: true,
      runValidators: true,
    }
  );
};

export default {
  findGroupById,
  findGroupByIdCompanyAndWorkspace,
  findGroupByCode,
  findGroupByName,
  createGroup,
  saveGroup,
  getGroups,
  deleteGroupById,
};
