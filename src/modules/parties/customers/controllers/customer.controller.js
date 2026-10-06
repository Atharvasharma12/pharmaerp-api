import asyncHandler from "../../../../utils/asyncHandler.js";
import ApiResponse from "../../../../utils/ApiResponse.js";
import customerService from "../services/customer.service.js";
import invoiceService from "../../../sales/invoices/services/invoice.service.js";

export const createCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer(
    req.workspaceId,
    req.companyId,
    req.user._id,
    req.body
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Customer created successfully", customer));
});

export const getCustomers = asyncHandler(async (req, res) => {
  const result = await customerService.getCustomers(
    req.workspaceId,
    req.companyId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customers fetched successfully", result));
});

export const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomerById(
    req.params.customerId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer fetched successfully", customer));
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(
    req.params.customerId,
    req.companyId,
    req.workspaceId,
    req.user._id,
    req.body
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer updated successfully", customer));
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  await customerService.deleteCustomer(
    req.params.customerId,
    req.companyId,
    req.workspaceId,
    req.user._id
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer deleted successfully"));
});

export const getCustomerLedger = asyncHandler(async (req, res) => {
  const ledger = await customerService.getCustomerLedger(
    req.params.customerId,
    req.companyId,
    req.workspaceId,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer ledger fetched successfully", ledger));
});

export const getCustomerOutstanding = asyncHandler(async (req, res) => {
  const outstanding = await customerService.getCustomerOutstanding(
    req.params.customerId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer outstanding fetched successfully", outstanding));
});



export const getCustomerPayments = asyncHandler(async (req, res) => {
  const payments = await customerService.getCustomerPayments(
    req.params.customerId,
    req.companyId,
    req.workspaceId
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer payments fetched successfully", payments));
});

export const getCustomerSales = asyncHandler(async (req, res) => {
  const salesResult = await invoiceService.getCustomerSales(
    req.params.customerId,
    req.companyId,
    req.workspaceId,
    null,
    req.query
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Customer sales fetched successfully", salesResult));
});

export const previewImport = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json(new ApiResponse(400, "Excel file is required"));
  }
  
  const importType = req.body.importType || "b2b";
  let result;
  
  if (importType === "b2b-outstanding") {
    // We will inject the new parser service later
    result = await customerService.previewB2BOutstandingImport(
      req.workspaceId,
      req.companyId,
      req.file.buffer
    );
  } else if (importType === "b2c") {
    // Parse using the robust xlsx parser for .xlsx files
    const parsedData = await customerService.previewImport(
      req.workspaceId,
      req.companyId,
      req.file.buffer,
      importType
    );

    const validCustomersData = parsedData
      .filter((r) => r.isValid)
      .map((r) => ({ ...r.data, customerType: "other" }));

    if (validCustomersData.length > 0) {
      try {
        const importResult = await customerService.confirmImport(
          req.workspaceId,
          req.companyId,
          req.user._id,
          validCustomersData,
          importType
        );

        return res.status(200).json(
          new ApiResponse(200, "B2C Customers imported successfully", {
            isDirectlyImported: true,
            importResult,
          })
        );
      } catch (err) {
        return res.status(500).json(new ApiResponse(500, `Bulk insert failed: ${err.message}`));
      }
    } else {
      return res.status(400).json(new ApiResponse(400, "No valid B2C customer records found in the file. Ensure the Excel file has valid 'Name' columns."));
    }
  } else {
    // Default to B2B logic
    result = await customerService.previewImport(
      req.workspaceId,
      req.companyId,
      req.file.buffer,
      importType
    );
  }
  
  return res.status(200).json(new ApiResponse(200, "Preview generated successfully", result));
});

export const confirmImport = asyncHandler(async (req, res) => {
  const importType = req.body.importType || "b2b";
  let result;
  
  if (importType === "b2b-outstanding") {
    result = await customerService.confirmB2BOutstandingImport(
      req.workspaceId,
      req.companyId,
      req.user._id,
      req.body.customers
    );
  } else {
    result = await customerService.confirmImport(
      req.workspaceId,
      req.companyId,
      req.user._id,
      req.body.customers,
      importType
    );
  }
  
  return res.status(200).json(new ApiResponse(200, "Customers imported successfully", result));
});
