export const DEFAULT_GROUPS = [
  {
    groupCode: "CASH_BANK",
    groupName: "Cash & Bank Accounts",
    nature: "ASSET",
  },
  {
    groupCode: "BANK_ACCOUNTS",
    groupName: "Bank Accounts",
    nature: "ASSET",
    parentGroupCode: "CASH_BANK",
  },
  { groupCode: "CURRENT_ASSETS", groupName: "Current Assets", nature: "ASSET" },
  { groupCode: "FIXED_ASSETS", groupName: "Fixed Assets", nature: "ASSET" },
  {
    groupCode: "CURRENT_LIABILITIES",
    groupName: "Current Liabilities",
    nature: "LIABILITY",
  },
  { groupCode: "EQUITY_GROUP", groupName: "Equity", nature: "EQUITY" },
  {
    groupCode: "OPERATING_REVENUE",
    groupName: "Operating Revenue",
    nature: "INCOME",
  },
  {
    groupCode: "NON_OPERATING_INCOME",
    groupName: "Non-Operating Income",
    nature: "INCOME",
  },
  {
    groupCode: "COGS_GROUP",
    groupName: "Cost of Goods Sold",
    nature: "EXPENSE",
  },
  {
    groupCode: "OPERATING_EXPENSES",
    groupName: "Operating Expenses",
    nature: "EXPENSE",
  },
];

export const DEFAULT_ACCOUNTS = [
  // Cash & Bank
  {
    accountCode: "PETTY-CASH",
    accountName: "Petty Cash",
    groupCode: "CASH_BANK",
    category: "CASH",
    openingBalanceType: "dr",
  },
  {
    accountCode: "COUNTER-CASH",
    accountName: "Counter Cash",
    groupCode: "CASH_BANK",
    category: "CASH",
    openingBalanceType: "dr",
  },

  // Current Assets
  {
    accountCode: "ACCOUNTS-RECEIVABLE",
    accountName: "Accounts Receivable (Debtors)",
    groupCode: "CURRENT_ASSETS",
    category: "CUSTOMER",
    openingBalanceType: "dr",
  },
  {
    accountCode: "INVENTORY-STOCK",
    accountName: "Inventory Stock",
    groupCode: "CURRENT_ASSETS",
    category: "INVENTORY",
    openingBalanceType: "dr",
  },
  {
    accountCode: "PREPAID-EXPENSES",
    accountName: "Prepaid Expenses",
    groupCode: "CURRENT_ASSETS",
    category: "EXPENSE",
    openingBalanceType: "dr",
  },

  // Fixed Assets
  {
    accountCode: "SHOP-FITTINGS",
    accountName: "Shop Fittings & Equipment",
    groupCode: "FIXED_ASSETS",
    category: "FIXED_ASSET",
    openingBalanceType: "dr",
  },
  {
    accountCode: "POS-HARDWARE",
    accountName: "Computers & POS Hardware",
    groupCode: "FIXED_ASSETS",
    category: "FIXED_ASSET",
    openingBalanceType: "dr",
  },

  // Current Liabilities
  {
    accountCode: "ACCOUNTS-PAYABLE",
    accountName: "Accounts Payable (Creditors)",
    groupCode: "CURRENT_LIABILITIES",
    category: "SUPPLIER",
    openingBalanceType: "cr",
  },
  {
    accountCode: "TAX-PAYABLE",
    accountName: "Sales Tax / GST Payable",
    groupCode: "CURRENT_LIABILITIES",
    category: "GST",
    openingBalanceType: "cr",
  },
  {
    accountCode: "SALARY-PAYABLE",
    accountName: "Salary Payable",
    groupCode: "CURRENT_LIABILITIES",
    category: "LIABILITY",
    openingBalanceType: "cr",
  },

  // Equity
  {
    accountCode: "SHARE-CAPITAL",
    accountName: "Share Capital",
    groupCode: "EQUITY_GROUP",
    category: "EQUITY",
    openingBalanceType: "cr",
  },
  {
    accountCode: "RETAINED-EARNINGS",
    accountName: "Retained Earnings",
    groupCode: "EQUITY_GROUP",
    category: "EQUITY",
    openingBalanceType: "cr",
  },
  {
    accountCode: "OB-EQUITY",
    accountName: "Opening Balance Equity",
    groupCode: "EQUITY_GROUP",
    category: "EQUITY",
    openingBalanceType: "cr",
  },

  // Revenue
  {
    accountCode: "SALES-REVENUE",
    accountName: "Sales Revenue",
    groupCode: "OPERATING_REVENUE",
    category: "SALES",
    openingBalanceType: "cr",
  },
  {
    accountCode: "SALES-DISCOUNT",
    accountName: "Sales Discount",
    groupCode: "OPERATING_REVENUE",
    category: "SALES",
    openingBalanceType: "dr",
  },
  {
    accountCode: "INTEREST-INCOME",
    accountName: "Interest Income",
    groupCode: "NON_OPERATING_INCOME",
    category: "INCOME",
    openingBalanceType: "cr",
  },

  // Cost of Goods Sold
  {
    accountCode: "COGS",
    accountName: "Cost of Goods Sold",
    groupCode: "COGS_GROUP",
    category: "PURCHASE",
    openingBalanceType: "dr",
  },
  {
    accountCode: "PURCHASE-DISCOUNT",
    accountName: "Purchase Discount",
    groupCode: "COGS_GROUP",
    category: "PURCHASE",
    openingBalanceType: "cr",
  },

  // Operating Expenses
  {
    accountCode: "RENT-EXPENSE",
    accountName: "Rent Expense",
    groupCode: "OPERATING_EXPENSES",
    category: "EXPENSE",
    openingBalanceType: "dr",
  },
  {
    accountCode: "UTILITY-EXPENSE",
    accountName: "Electricity & Utilities",
    groupCode: "OPERATING_EXPENSES",
    category: "EXPENSE",
    openingBalanceType: "dr",
  },
  {
    accountCode: "SALARY-EXPENSE",
    accountName: "Salaries & Wages",
    groupCode: "OPERATING_EXPENSES",
    category: "EXPENSE",
    openingBalanceType: "dr",
  },
  {
    accountCode: "BANK-CHARGES",
    accountName: "Bank Charges",
    groupCode: "OPERATING_EXPENSES",
    category: "EXPENSE",
    openingBalanceType: "dr",
  },
  {
    accountCode: "EXPIRED-STOCK-LOSS",
    accountName: "Expired & Damaged Stock Write-off",
    groupCode: "OPERATING_EXPENSES",
    category: "EXPENSE",
    openingBalanceType: "dr",
  },
];
