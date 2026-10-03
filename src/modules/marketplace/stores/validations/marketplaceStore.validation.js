import Joi from "joi";

const objectId = Joi.string()
  .trim()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    "string.pattern.base": "Invalid id",
  });

const workingHoursDaySchema = Joi.object({
  isOpen: Joi.boolean().optional(),
  openTime: Joi.string()
    .trim()
    .pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      "string.pattern.base": "openTime must be in HH:MM format",
    }),
  closeTime: Joi.string()
    .trim()
    .pattern(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .optional()
    .messages({
      "string.pattern.base": "closeTime must be in HH:MM format",
    }),
});

const workingHoursSchema = Joi.object({
  monday: workingHoursDaySchema.optional(),
  tuesday: workingHoursDaySchema.optional(),
  wednesday: workingHoursDaySchema.optional(),
  thursday: workingHoursDaySchema.optional(),
  friday: workingHoursDaySchema.optional(),
  saturday: workingHoursDaySchema.optional(),
  sunday: workingHoursDaySchema.optional(),
});

export const createMarketplaceStoreSchema = Joi.object({
  storeName: Joi.string().trim().min(2).max(160).required(),
  companyId: objectId.optional(),
  branchId: objectId.optional(),

  workingHours: workingHoursSchema.optional(),
});

export const updateMarketplaceStoreSchema = Joi.object({
  storeName: Joi.string().trim().min(2).max(160).optional(),

  workingHours: workingHoursSchema.optional(),
}).min(1);

export const marketplaceStoreIdParamSchema = Joi.object({
  storeId: objectId.required(),
});
