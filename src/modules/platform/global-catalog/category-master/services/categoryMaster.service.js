import ApiError from "../../../../../utils/ApiError.js";

import categoryMasterRepository from "../repositories/categoryMaster.repository.js";
import { CATEGORY_MASTER_STATUS } from "../constants/categoryMaster.constant.js";

// Helper to generate a slug
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
};

// ---------------------
// Create
// ---------------------

/**
 * Create a new Category master record.
 * - name must be unique under the same parent.
 * - slug is auto-generated and unique globally.
 * - level is calculated based on parent's level.
 */
const createCategoryMaster = async (payload) => {
  // Determine parent and calculate level
  let level = 0;
  if (payload.parentCategory) {
    const parent = await categoryMasterRepository.findCategoryMasterById(payload.parentCategory);
    if (!parent) {
      throw new ApiError(400, "Parent category not found");
    }
    level = parent.level + 1;
  }

  // Check unique name under same parent
  const existingByName = await categoryMasterRepository.findCategoryMasterByNameAndParent(payload.name, payload.parentCategory);
  if (existingByName) {
    throw new ApiError(400, `Category with name "${payload.name.trim()}" already exists under this parent`);
  }

  // Generate unique slug
  const baseSlug = slugify(payload.name);
  let finalSlug = baseSlug;
  let counter = 1;
  while (true) {
    const existingBySlug = await categoryMasterRepository.findCategoryMasterBySlug(finalSlug);
    if (!existingBySlug) {
      break;
    }
    finalSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  const categoryPayload = {
    name: payload.name.trim(),
    slug: finalSlug,
    parentCategory: payload.parentCategory || null,
    level,
    description: payload.description || null,
    imageUrl: payload.imageUrl || null,
    isActive:
      payload.isActive !== undefined
        ? payload.isActive
        : CATEGORY_MASTER_STATUS.ACTIVE,
  };

  const categoryMaster = await categoryMasterRepository.createCategoryMaster(categoryPayload);

  return categoryMaster.toSafeObject();
};

// ---------------------
// Read
// ---------------------

const getCategoryMasters = async (filters = {}, options = {}) => {
  const { categoryMasters, total, page, limit } =
    await categoryMasterRepository.getCategoryMasters(filters, options);

  return {
    categoryMasters: categoryMasters.map((c) => c.toSafeObject()),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

const getCategoryMasterById = async (categoryId) => {
  const categoryMaster = await categoryMasterRepository.findCategoryMasterById(categoryId);

  if (!categoryMaster) {
    throw new ApiError(404, "Category master record not found");
  }

  return categoryMaster.toSafeObject();
};

const getCategoryMasterBySlug = async (slug) => {
  const categoryMaster = await categoryMasterRepository.findCategoryMasterBySlug(slug);

  if (!categoryMaster) {
    throw new ApiError(404, "Category master record not found");
  }

  return categoryMaster.toSafeObject();
};

// ---------------------
// Update
// ---------------------

/**
 * Update a Category master record.
 *
 * Rules:
 * - A category cannot be its own parent.
 * - Level is recalculated if parentCategory changes.
 * - If name changes, check uniqueness under the parent and regenerate slug.
 */
const updateCategoryMaster = async (categoryId, payload) => {
  const categoryMaster = await categoryMasterRepository.findCategoryMasterById(categoryId);

  if (!categoryMaster) {
    throw new ApiError(404, "Category master record not found");
  }

  // Recalculate parent and level if parentCategory changes
  if (payload.parentCategory !== undefined && payload.parentCategory !== (categoryMaster.parentCategory ? String(categoryMaster.parentCategory._id || categoryMaster.parentCategory) : null)) {
    if (payload.parentCategory === categoryId) {
      throw new ApiError(400, "A category cannot be its own parent");
    }

    let level = 0;
    if (payload.parentCategory) {
      const parent = await categoryMasterRepository.findCategoryMasterById(payload.parentCategory);
      if (!parent) {
        throw new ApiError(400, "Parent category not found");
      }
      level = parent.level + 1;
    }
    categoryMaster.parentCategory = payload.parentCategory || null;
    categoryMaster.level = level;
  }

  // Recalculate name and slug if name changes
  if (payload.name && payload.name.trim().toLowerCase() !== categoryMaster.name.toLowerCase()) {
    const parentId = payload.parentCategory !== undefined ? payload.parentCategory : categoryMaster.parentCategory;
    const existingByName = await categoryMasterRepository.findCategoryMasterByNameAndParent(payload.name, parentId);
    if (existingByName) {
      throw new ApiError(400, `Category with name "${payload.name.trim()}" already exists under this parent`);
    }
    categoryMaster.name = payload.name.trim();

    // Regenerate unique slug
    const baseSlug = slugify(payload.name);
    let finalSlug = baseSlug;
    let counter = 1;
    while (true) {
      const existingBySlug = await categoryMasterRepository.findCategoryMasterBySlug(finalSlug);
      if (!existingBySlug || String(existingBySlug._id) === categoryId) {
        break;
      }
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }
    categoryMaster.slug = finalSlug;
  }

  const allowedFields = ["description", "imageUrl", "isActive"];

  allowedFields.forEach((field) => {
    if (payload[field] !== undefined) {
      categoryMaster[field] = payload[field];
    }
  });

  await categoryMasterRepository.saveCategoryMaster(categoryMaster);

  return categoryMaster.toSafeObject();
};

// ---------------------
// Delete
// ---------------------

/**
 * Permanently delete a Category master record.
 * Check that no other categories reference this one as parent first.
 */
const deleteCategoryMaster = async (categoryId) => {
  // Check if any sub-categories exist referencing this category as parent
  const subCats = await categoryMasterRepository.getCategoryMasters({ parentCategory: categoryId }, { limit: 1 });
  if (subCats.total > 0) {
    throw new ApiError(400, "Cannot delete category that has sub-categories. Delete sub-categories first.");
  }

  const categoryMaster = await categoryMasterRepository.deleteCategoryMasterById(categoryId);

  if (!categoryMaster) {
    throw new ApiError(404, "Category master record not found");
  }

  return { success: true };
};

export default {
  createCategoryMaster,
  getCategoryMasters,
  getCategoryMasterById,
  getCategoryMasterBySlug,
  updateCategoryMaster,
  deleteCategoryMaster,
};
