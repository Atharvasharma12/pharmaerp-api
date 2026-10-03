import Joi from "joi";

import {
  WORKSPACE_STATUS,
  WORKSPACE_TYPE,
} from "../../../organization/workspaces/constants/workspace.constant.js";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

/**
 * Param validation — :workspaceId
 */
export const platformWorkspaceIdParamSchema = Joi.object({
  workspaceId: objectId.required(),
});

/**
 * Query validation — GET /platform/workspaces
 */
export const getPlatformWorkspacesQuerySchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(WORKSPACE_STATUS))
    .optional(),

  type: Joi.string()
    .valid(...Object.values(WORKSPACE_TYPE))
    .optional(),

  ownerId: objectId.optional(),

  search: Joi.string().trim().max(200).optional(),

  page: Joi.number().integer().min(1).optional(),

  limit: Joi.number().integer().min(1).max(100).optional(),
});

/**
 * Body validation — PATCH /platform/workspaces/:workspaceId/status
 */
export const updatePlatformWorkspaceStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      WORKSPACE_STATUS.ACTIVE,
      WORKSPACE_STATUS.INACTIVE,
      WORKSPACE_STATUS.SUSPENDED,
    )
    .required(),
});
