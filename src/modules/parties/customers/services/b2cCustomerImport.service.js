import mongoose from "mongoose";
import crypto from "crypto";
import {
  normalizeIndianPhone,
  isValidIndianMobile,
  normalizeCustomerName,
  getDefaultRelationForPosition,
  getReciprocalRelation,
} from "../helpers/phoneNormalizer.js";
import SharedContactGroup from "../models/sharedContactGroup.model.js";
import CustomerRelationship, { CONFIRMATION_STATUS } from "../models/customerRelationship.model.js";
import Customer from "../models/customer.model.js";

export const ROW_STATUS = {
  VALID_CANDIDATE: "VALID_CANDIDATE",
  NEW_CUSTOMER: "NEW_CUSTOMER",
  EXISTING_CUSTOMER_MATCHED: "EXISTING_CUSTOMER_MATCHED",
  DUPLICATE_ROW_IN_FILE: "DUPLICATE_ROW_IN_FILE",
  SHARED_PHONE_DETECTED: "SHARED_PHONE_DETECTED",
  MISSING_PHONE: "MISSING_PHONE",
  INVALID_PHONE: "INVALID_PHONE",
  MISSING_NAME: "MISSING_NAME",
  MULTIPLE_MATCHES_REVIEW: "MULTIPLE_MATCHES_REVIEW",
  POSSIBLE_DUPLICATE_REVIEW: "POSSIBLE_DUPLICATE_REVIEW",
};

/**
 * Extracts a field value given explicit mapping or common alias fallback.
 */
const extractField = (row, mappedField, fallbackKeys = []) => {
  if (mappedField && row[mappedField] !== undefined && row[mappedField] !== null) {
    return String(row[mappedField]).trim();
  }

  // Fallback to lowercase search
  const rowKeys = Object.keys(row);
  for (const key of fallbackKeys) {
    const matchedKey = rowKeys.find((k) => k.toLowerCase().trim() === key.toLowerCase().trim());
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return String(row[matchedKey]).trim();
    }
  }

  // Substring match
  for (const key of fallbackKeys) {
    const matchedKey = rowKeys.find((k) => k.toLowerCase().includes(key.toLowerCase()));
    if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
      return String(row[matchedKey]).trim();
    }
  }

  return "";
};

/**
 * Parses raw Excel rows into structured objects with validation status.
 */
export const parseB2CRows = (rows, columnMapping = {}, startRowNumber = 2) => {
  const nameKeys = ["customer name", "name", "customer", "party name", "ledger name", "patient name", "client"];
  const phoneKeys = ["mobile", "phone", "contact", "mobile number", "contact number", "cell"];
  const cityKeys = ["city", "location", "town", "district", "address", "station"];
  const genderKeys = ["gender", "sex"];

  return rows.map((rawRow, index) => {
    const rowNumber = index + startRowNumber;

    if (!rawRow || (typeof rawRow === "object" && Object.keys(rawRow).length === 0)) {
      return {
        rowNumber,
        isValid: false,
        status: ROW_STATUS.MISSING_NAME,
        name: "",
        phone: "",
        rawPhone: "",
        city: "",
        gender: null,
        skipReason: "Empty row",
      };
    }

    const rawName = extractField(rawRow, columnMapping.nameField, nameKeys);
    const rawPhone = extractField(rawRow, columnMapping.phoneField, phoneKeys);
    const rawCity = extractField(rawRow, columnMapping.cityField, cityKeys);
    const rawGender = extractField(rawRow, columnMapping.genderField, genderKeys);

    const normalizedName = normalizeCustomerName(rawName);

    // Rule 4: Skip missing customer name
    if (!normalizedName) {
      return {
        rowNumber,
        isValid: false,
        status: ROW_STATUS.MISSING_NAME,
        name: rawName,
        phone: rawPhone,
        rawPhone,
        city: rawCity,
        gender: rawGender || null,
        skipReason: "Missing customer name",
      };
    }

    // Rule 4 & 5: Skip missing, blank, or invalid phone numbers
    const normalizedPhone = normalizeIndianPhone(rawPhone);

    if (!normalizedPhone) {
      const isBlankOrPlaceholder =
        !rawPhone ||
        rawPhone.trim() === "" ||
        ["n/a", "na", "-", "--", "nil", "none"].includes(rawPhone.trim().toLowerCase());

      return {
        rowNumber,
        isValid: false,
        status: isBlankOrPlaceholder ? ROW_STATUS.MISSING_PHONE : ROW_STATUS.INVALID_PHONE,
        name: rawName,
        normalizedName,
        phone: rawPhone,
        rawPhone,
        city: rawCity,
        gender: rawGender || null,
        skipReason: isBlankOrPlaceholder
          ? "Missing or blank phone number"
          : `Invalid Indian phone number: '${rawPhone}' (must be 10 digits starting with 6-9)`,
      };
    }

    let parsedGender = null;
    if (rawGender) {
      const g = rawGender.toLowerCase().trim();
      if (g.startsWith("m")) parsedGender = "male";
      else if (g.startsWith("f")) parsedGender = "female";
      else parsedGender = "other";
    }

    return {
      rowNumber,
      isValid: true,
      status: ROW_STATUS.VALID_CANDIDATE,
      name: rawName,
      normalizedName,
      phone: normalizedPhone,
      rawPhone,
      city: rawCity,
      gender: parsedGender,
    };
  });
};

/**
 * Categorizes a valid row against pre-fetched database records and file state.
 */
export const categorizeB2CRow = (parsedRow, context) => {
  if (!parsedRow.isValid) {
    return parsedRow;
  }

  const { existingCustomers = [], seenFileKeys, seenFilePhones } = context;
  const { normalizedName, phone } = parsedRow;
  const customerKey = `${normalizedName}|${phone}`;

  // 1. Check existing database records with this phone
  const samePhoneCustomers = existingCustomers.filter((c) => (c.mobile || "").trim() === phone);

  if (samePhoneCustomers.length > 0) {
    const exactMatches = samePhoneCustomers.filter(
      (c) => normalizeCustomerName(c.name) === normalizedName
    );

    // Condition F: Multiple pre-existing matches
    if (exactMatches.length > 1) {
      return {
        ...parsedRow,
        status: ROW_STATUS.MULTIPLE_MATCHES_REVIEW,
        matchingCustomerIds: exactMatches.map((c) => c._id),
        reviewReason: "Multiple pre-existing database records match this name and phone number",
      };
    }

    // Condition B: Exact match in database
    if (exactMatches.length === 1) {
      return {
        ...parsedRow,
        status: ROW_STATUS.EXISTING_CUSTOMER_MATCHED,
        matchedCustomerId: exactMatches[0]._id,
      };
    }

    // Condition E: Same phone with different existing customer name
    return {
      ...parsedRow,
      status: ROW_STATUS.SHARED_PHONE_DETECTED,
      sharedWithExisting: true,
    };
  }

  // 2. Check duplicates inside the same file
  if (seenFileKeys.has(customerKey)) {
    // Condition B: Repeated rows in file
    return {
      ...parsedRow,
      status: ROW_STATUS.DUPLICATE_ROW_IN_FILE,
      matchedCustomerId: seenFileKeys.get(customerKey),
    };
  }

  // 3. Check shared phone inside the file with a different name
  if (seenFilePhones.has(phone)) {
    // Condition D: Different names, same phone
    seenFileKeys.set(customerKey, true);
    return {
      ...parsedRow,
      status: ROW_STATUS.SHARED_PHONE_DETECTED,
    };
  }

  // 4. Condition A: Brand new customer
  seenFileKeys.set(customerKey, true);
  seenFilePhones.set(phone, true);

  return {
    ...parsedRow,
    status: ROW_STATUS.NEW_CUSTOMER,
  };
};

/**
 * Assigns default relationships when appending new members to a shared-contact group.
 * Preserves existing members and assigns relationships according to Section 13.B.
 */
export const assignGroupRelationships = (existingMembers = [], newCustomerIds = []) => {
  const result = [...existingMembers];
  const existingSet = new Set(result.map((m) => m.customerId.toString()));

  let nextPosition = result.length;

  for (const id of newCustomerIds) {
    const idStr = id.toString();
    if (!existingSet.has(idStr)) {
      const relation = getDefaultRelationForPosition(nextPosition);
      result.push({
        customerId: id,
        relation,
      });
      existingSet.add(idStr);
      nextPosition++;
    }
  }

  return result;
};

/**
 * Assigns member sequences and timestamps when appending new members to a shared-contact group.
 * Guarantees no duplicate customer IDs in the group.
 */
export const assignGroupMembers = (existingMembers = [], newCustomerIds = []) => {
  const result = [...existingMembers];
  const existingSet = new Set(result.map((m) => m.customerId.toString()));
  let nextSequence =
    result.length > 0
      ? Math.max(...result.map((m) => m.sequence || 1)) + 1
      : 1;

  for (const id of newCustomerIds) {
    const idStr = id.toString();
    if (!existingSet.has(idStr)) {
      result.push({
        customerId: id,
        sequence: nextSequence,
        joinedAt: new Date(),
      });
      existingSet.add(idStr);
      nextSequence++;
    }
  }

  return result;
};

/**
 * Generates pairwise CustomerRelationship records for members of a shared-contact group.
 * Initial positional defaults are created with confirmationStatus = "suggested".
 * Customer looking at self has relationship = "Self" and confirmationStatus = "confirmed".
 */
export const generatePairwiseRelationships = (
  groupMembers = [],
  customerGenders = new Map()
) => {
  const sortedMembers = [...groupMembers].sort(
    (a, b) => (a.sequence || 1) - (b.sequence || 1)
  );

  const anchor = sortedMembers[0];
  const pairs = [];

  for (let i = 0; i < sortedMembers.length; i++) {
    const source = sortedMembers[i];
    for (let j = 0; j < sortedMembers.length; j++) {
      const target = sortedMembers[j];

      if (source.customerId.toString() === target.customerId.toString()) {
        pairs.push({
          sourceCustomerId: source.customerId,
          targetCustomerId: target.customerId,
          relationship: "Self",
          confirmationStatus: CONFIRMATION_STATUS.CONFIRMED,
        });
        continue;
      }

      if (anchor && source.customerId.toString() === anchor.customerId.toString()) {
        const relation = getDefaultRelationForPosition(j);
        pairs.push({
          sourceCustomerId: source.customerId,
          targetCustomerId: target.customerId,
          relationship: relation,
          confirmationStatus: CONFIRMATION_STATUS.SUGGESTED,
        });
        continue;
      }

      if (anchor && target.customerId.toString() === anchor.customerId.toString()) {
        const relationToAnchor = getDefaultRelationForPosition(i);
        const anchorGender = customerGenders.get(anchor.customerId.toString()) || null;
        const reciprocal = getReciprocalRelation(relationToAnchor, {
          isSameCustomer: false,
          targetGender: anchorGender,
        });
        pairs.push({
          sourceCustomerId: source.customerId,
          targetCustomerId: target.customerId,
          relationship: reciprocal,
          confirmationStatus: CONFIRMATION_STATUS.SUGGESTED,
        });
        continue;
      }

      pairs.push({
        sourceCustomerId: source.customerId,
        targetCustomerId: target.customerId,
        relationship: "Other",
        confirmationStatus: CONFIRMATION_STATUS.SUGGESTED,
      });
    }
  }

  return pairs;
};

/**
 * Builds reciprocal members array for a specific customer from their own perspective.
 */
export const buildReciprocalCustomerMembers = (
  targetCustomerId,
  groupMembers,
  customerGenders = new Map()
) => {
  const targetIdStr = targetCustomerId.toString();
  const anchorMember = groupMembers[0];
  const isTargetAnchor = anchorMember && anchorMember.customerId.toString() === targetIdStr;

  return groupMembers.map((member) => {
    const isSelf = member.customerId.toString() === targetIdStr;
    if (isSelf) {
      return {
        customerId: member.customerId,
        relation: "Self",
      };
    }

    if (isTargetAnchor) {
      // From the anchor's perspective, the member has the relation declared in groupMembers
      return {
        customerId: member.customerId,
        relation: member.relation,
      };
    }

    // For a non-anchor customer looking at the anchor:
    if (anchorMember && member.customerId.toString() === anchorMember.customerId.toString()) {
      const targetInGroup = groupMembers.find(
        (m) => m.customerId.toString() === targetIdStr
      );
      const targetRelationToAnchor = targetInGroup ? targetInGroup.relation : "Other";
      const anchorGender = customerGenders.get(anchorMember.customerId.toString()) || null;

      const reciprocal = getReciprocalRelation(targetRelationToAnchor, {
        isSameCustomer: false,
        targetGender: anchorGender,
      });

      return {
        customerId: member.customerId,
        relation: reciprocal,
      };
    }

    // Between two non-anchor members
    return {
      customerId: member.customerId,
      relation: "Other",
    };
  });
};

/**
 * Previews and categorizes all rows in the B2C import.
 */
export const analyzeB2CImport = async (workspaceId, companyId, rows, columnMapping = {}) => {
  const parsedRows = parseB2CRows(rows, columnMapping);

  const validPhones = parsedRows
    .filter((r) => r.isValid && r.phone)
    .map((r) => r.phone);

  const uniquePhones = Array.from(new Set(validPhones));

  // Query existing customers by phone within workspace & company
  let existingCustomers = [];
  if (uniquePhones.length > 0) {
    existingCustomers = await Customer.find({
      workspaceId,
      companyId,
      isDeleted: false,
      mobile: { $in: uniquePhones },
    })
      .select("_id name mobile gender sharedContactGroupId members")
      .lean();
  }

  const seenFileKeys = new Map();
  const seenFilePhones = new Map();

  const categorizedRows = parsedRows.map((row) =>
    categorizeB2CRow(row, {
      existingCustomers,
      seenFileKeys,
      seenFilePhones,
    })
  );

  // Compute summary metrics
  const summary = {
    totalRows: categorizedRows.length,
    newCustomers: categorizedRows.filter((r) => r.status === ROW_STATUS.NEW_CUSTOMER).length,
    existingCustomersMatched: categorizedRows.filter(
      (r) => r.status === ROW_STATUS.EXISTING_CUSTOMER_MATCHED
    ).length,
    duplicateRowsInFile: categorizedRows.filter(
      (r) => r.status === ROW_STATUS.DUPLICATE_ROW_IN_FILE
    ).length,
    sharedPhoneNumbers: categorizedRows.filter(
      (r) => r.status === ROW_STATUS.SHARED_PHONE_DETECTED
    ).length,
    skippedMissingPhone: categorizedRows.filter((r) => r.status === ROW_STATUS.MISSING_PHONE)
      .length,
    skippedInvalidPhone: categorizedRows.filter((r) => r.status === ROW_STATUS.INVALID_PHONE)
      .length,
    skippedMissingName: categorizedRows.filter((r) => r.status === ROW_STATUS.MISSING_NAME).length,
    reviewRequired: categorizedRows.filter(
      (r) =>
        r.status === ROW_STATUS.MULTIPLE_MATCHES_REVIEW ||
        r.status === ROW_STATUS.POSSIBLE_DUPLICATE_REVIEW
    ).length,
  };

  return {
    summary,
    previewRows: categorizedRows.slice(0, 100),
    allRowsCount: categorizedRows.length,
  };
};

/**
 * Confirms and executes B2C customer import with duplicate reuse and shared contact group sync.
 */
export const executeB2CImport = async (
  workspaceId,
  companyId,
  userId,
  rows,
  columnMapping = {},
  options = {}
) => {
  const startRowNumber = Number(options.startRowNumber) || 2;
  const parsedRows = parseB2CRows(rows, columnMapping, startRowNumber);

  const validPhones = parsedRows
    .filter((r) => r.isValid && r.phone)
    .map((r) => r.phone);

  const uniquePhones = Array.from(new Set(validPhones));

  let existingCustomers = [];
  if (uniquePhones.length > 0) {
    existingCustomers = await Customer.find({
      workspaceId,
      companyId,
      isDeleted: false,
      mobile: { $in: uniquePhones },
    })
      .select("_id name mobile gender sharedContactGroupId members customerCode")
      .lean();
  }

  const seenFileKeys = new Map();
  const seenFilePhones = new Map();

  const categorizedRows = parsedRows.map((row) =>
    categorizeB2CRow(row, {
      existingCustomers,
      seenFileKeys,
      seenFilePhones,
    })
  );

  const summary = {
    totalRows: categorizedRows.length,
    created: 0,
    reused: 0,
    duplicateRowsIgnored: 0,
    linkedToSharedContactGroups: 0,
    skippedMissingPhone: 0,
    skippedInvalidPhone: 0,
    skippedMissingName: 0,
    reviewRequired: 0,
    failed: 0,
  };

  const skippedRows = [];
  const rowsToInsert = [];
  const customerIdMap = new Map(); // key -> customerId

  for (const row of categorizedRows) {
    if (!row.isValid) {
      if (row.status === ROW_STATUS.MISSING_PHONE) summary.skippedMissingPhone++;
      else if (row.status === ROW_STATUS.INVALID_PHONE) summary.skippedInvalidPhone++;
      else if (row.status === ROW_STATUS.MISSING_NAME) summary.skippedMissingName++;

      skippedRows.push({
        rowNumber: row.rowNumber,
        name: row.name || "-",
        phone: row.rawPhone || "-",
        reason: row.skipReason || "Invalid row",
        status: row.status,
      });
      continue;
    }

    if (
      row.status === ROW_STATUS.MULTIPLE_MATCHES_REVIEW ||
      row.status === ROW_STATUS.POSSIBLE_DUPLICATE_REVIEW
    ) {
      summary.reviewRequired++;
      skippedRows.push({
        rowNumber: row.rowNumber,
        name: row.name,
        phone: row.phone,
        reason: row.reviewReason || "Review required",
        status: row.status,
        matchingCustomerIds: (row.matchingCustomerIds || []).join(", "),
      });
      continue;
    }

    if (row.status === ROW_STATUS.EXISTING_CUSTOMER_MATCHED) {
      summary.reused++;
      customerIdMap.set(`${row.normalizedName}|${row.phone}`, row.matchedCustomerId);
      continue;
    }

    if (row.status === ROW_STATUS.DUPLICATE_ROW_IN_FILE) {
      summary.duplicateRowsIgnored++;
      continue;
    }

    // NEW_CUSTOMER or SHARED_PHONE_DETECTED that is not already in DB
    const customerKey = `${row.normalizedName}|${row.phone}`;
    if (!customerIdMap.has(customerKey)) {
      const newId = new mongoose.Types.ObjectId();
      customerIdMap.set(customerKey, newId);

      rowsToInsert.push({
        _id: newId,
        name: row.name,
        mobile: row.phone,
        customerCode: null, // B2C customerCode is omitted/skipped to prevent unique index collisions
        customerType: "other",
        gender: row.gender || null,
        billingAddress: {
          city: row.city || null,
        },
        shippingAddress: {
          city: row.city || null,
        },
        workspaceId,
        companyId,
        createdBy: userId,
        status: "active",
      });
    }
  }

  // Insert genuinely new customers in batches
  if (rowsToInsert.length > 0) {
    const AccountGroup = mongoose.model("AccountGroup");
    const Account = mongoose.model("Account");

    let debtorsGroup =
      (await AccountGroup.findOne({ workspaceId, companyId, groupCode: "SUNDRY_DEBTORS" })) ||
      (await AccountGroup.findOne({ workspaceId, companyId, groupName: "Sundry Debtors" }));

    const accountsToInsert = [];

    for (const cust of rowsToInsert) {
      cust.customerCode = null;

      const accountId = new mongoose.Types.ObjectId();
      cust.ledgerAccountId = accountId;

      if (debtorsGroup) {
        // High-entropy collision-free account code per customer using unique ObjectId and timestamp
        const accCode = `CUST-${accountId.toString().slice(-8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        accountsToInsert.push({
          _id: accountId,
          workspaceId,
          companyId,
          accountCode: accCode,
          accountName: `${cust.name} - Customer`,
          accountGroupId: debtorsGroup._id,
          accountNature: "ASSET",
          accountCategory: "CUSTOMER",
          openingBalance: 0,
          openingBalanceType: "dr",
          status: "active",
          isSystemAccount: false,
          createdBy: userId,
        });
      }
    }

    if (accountsToInsert.length > 0) {
      try {
        await Account.insertMany(accountsToInsert, { ordered: false });
      } catch (accErr) {
        console.warn("Some accounts failed to insert during B2C import:", accErr.message);
      }
    }

    try {
      const insertedResult = await Customer.insertMany(rowsToInsert, { ordered: false });
      summary.created = insertedResult.length;
    } catch (insertErr) {
      if (insertErr.insertedDocs) {
        summary.created = insertErr.insertedDocs.length;
      }
      if (insertErr.writeErrors) {
        summary.failed += insertErr.writeErrors.length;
        insertErr.writeErrors.forEach((we) => {
          skippedRows.push({
            rowNumber: "-",
            name: "-",
            phone: "-",
            reason: `Database error: ${we.errmsg || we.message}`,
            status: "DB_ERROR",
          });
        });
      } else {
        throw insertErr;
      }
    }
  }

  // Now, manage SharedContactGroup and pairwise relationship sync for each distinct phone
  // Group all valid customers by normalized phone
  const phoneToCustomersMap = new Map();

  // Pre-load all customers with these phones to get accurate IDs & genders
  const allCurrentCustomers = await Customer.find({
    workspaceId,
    companyId,
    isDeleted: false,
    mobile: { $in: uniquePhones },
  })
    .select("_id name mobile gender sharedContactGroupId customerCode")
    .lean();

  for (const cust of allCurrentCustomers) {
    if (!cust.mobile) continue;
    const phone = cust.mobile.trim();
    if (!phoneToCustomersMap.has(phone)) {
      phoneToCustomersMap.set(phone, []);
    }
    phoneToCustomersMap.get(phone).push(cust);
  }

  // Pre-load existing SharedContactGroups
  const existingGroups = await SharedContactGroup.find({
    workspaceId,
    companyId,
    normalizedPhone: { $in: uniquePhones },
  });

  const groupMap = new Map(existingGroups.map((g) => [g.normalizedPhone, g]));

  const relationshipOps = [];
  const customerUpdatePromises = [];

  for (const [phone, custList] of phoneToCustomersMap.entries()) {
    let group = groupMap.get(phone);
    // Only create/update shared group if multiple customers share this phone or group already existed
    if (!group && custList.length <= 1) {
      continue;
    }

    if (!group) {
      group = new SharedContactGroup({
        workspaceId,
        companyId,
        normalizedPhone: phone,
        members: [],
      });
    }

    const currentCustomerIds = custList.map((c) => c._id);
    const updatedMembers = assignGroupMembers(group.members || [], currentCustomerIds);

    group.members = updatedMembers;
    await group.save();

    if (updatedMembers.length > 1) {
      summary.linkedToSharedContactGroups += updatedMembers.length;
    }

    // Set sharedContactGroupId on customer documents and ensure embedded members array is removed
    const memberIds = updatedMembers.map((m) => m.customerId);
    customerUpdatePromises.push(
      Customer.updateMany(
        { _id: { $in: memberIds } },
        {
          $set: { sharedContactGroupId: group._id },
          $unset: { members: 1 },
        }
      )
    );

    // Build gender lookup for all members in group
    const existingMemberIdsToFetch = updatedMembers
      .filter((m) => !custList.some((c) => c._id.toString() === m.customerId.toString()))
      .map((m) => m.customerId);

    let additionalCustomers = [];
    if (existingMemberIdsToFetch.length > 0) {
      additionalCustomers = await Customer.find({
        _id: { $in: existingMemberIdsToFetch },
      })
        .select("_id gender")
        .lean();
    }

    const genderMap = new Map();
    for (const c of custList) {
      genderMap.set(c._id.toString(), c.gender || null);
    }
    for (const c of additionalCustomers) {
      genderMap.set(c._id.toString(), c.gender || null);
    }

    // Generate pairwise relationships and upsert with $setOnInsert to preserve confirmed relationships
    const pairs = generatePairwiseRelationships(updatedMembers, genderMap);
    for (const pair of pairs) {
      relationshipOps.push({
        updateOne: {
          filter: {
            workspaceId,
            companyId,
            sourceCustomerId: pair.sourceCustomerId,
            targetCustomerId: pair.targetCustomerId,
          },
          update: {
            $setOnInsert: {
              workspaceId,
              companyId,
              sharedContactGroupId: group._id,
              sourceCustomerId: pair.sourceCustomerId,
              targetCustomerId: pair.targetCustomerId,
              relationship: pair.relationship,
              confirmationStatus: pair.confirmationStatus,
              confirmedBy: null,
              confirmedAt: null,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (customerUpdatePromises.length > 0) {
    await Promise.all(customerUpdatePromises);
  }

  if (relationshipOps.length > 0) {
    await CustomerRelationship.bulkWrite(relationshipOps, { ordered: false });
  }

  return {
    summary,
    skippedRows,
  };
};

export default {
  ROW_STATUS,
  parseB2CRows,
  categorizeB2CRow,
  assignGroupRelationships,
  assignGroupMembers,
  buildReciprocalCustomerMembers,
  generatePairwiseRelationships,
  analyzeB2CImport,
  executeB2CImport,
};
