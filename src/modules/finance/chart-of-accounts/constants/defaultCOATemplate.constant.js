export const DEFAULT_GROUPS = [
  { groupCode: "CASH_BANK",       groupName: "Cash & Bank",          nature: "ASSET"     },
  { groupCode: "CUSTOMERS",       groupName: "Customer Accounts",    nature: "ASSET"     },
  { groupCode: "STOCK",           groupName: "Medicine Stock",       nature: "ASSET"     },
  { groupCode: "FIXED_ASSETS",    groupName: "Shop & Equipment",     nature: "ASSET"     },
  { groupCode: "SUPPLIERS",       groupName: "Supplier Accounts",    nature: "LIABILITY" },
  { groupCode: "GST_TAXES",       groupName: "GST & Tax",            nature: "LIABILITY" },
  { groupCode: "EQUITY_GROUP",    groupName: "Capital & Equity",     nature: "EQUITY"    },
  { groupCode: "SALES_REVENUE",   groupName: "Sales Revenue",        nature: "INCOME"    },
  { groupCode: "PURCHASE_COST",   groupName: "Medicine Purchase Cost", nature: "EXPENSE" },
  { groupCode: "EXPENSES",        groupName: "Operating Expenses",   nature: "EXPENSE"   },
];

export const DEFAULT_ACCOUNTS = [
  { accountCode: "COUNTER-CASH",      accountName: "Counter Cash",              groupCode: "CASH_BANK",       category: "CASH",      openingBalanceType: "dr" },
  { accountCode: "ACCOUNTS-RECEIVABLE", accountName: "Customer Receivable",     groupCode: "CUSTOMERS",       category: "CUSTOMER",  openingBalanceType: "dr" },
  { accountCode: "MEDICINE-STOCK",    accountName: "Medicine Inventory",        groupCode: "STOCK",           category: "INVENTORY", openingBalanceType: "dr" },
  { accountCode: "ACCOUNTS-PAYABLE",  accountName: "Supplier Payable",          groupCode: "SUPPLIERS",       category: "SUPPLIER",  openingBalanceType: "cr" },
  { accountCode: "GST-INPUT",         accountName: "GST Input (Purchases)",     groupCode: "GST_TAXES",       category: "GST",       openingBalanceType: "dr" },
  { accountCode: "GST-OUTPUT",        accountName: "GST Output (Sales)",        groupCode: "GST_TAXES",       category: "GST",       openingBalanceType: "cr" },
  { accountCode: "OB-EQUITY",         accountName: "Opening Balance Equity",    groupCode: "EQUITY_GROUP",    category: "EQUITY",    openingBalanceType: "cr" },
  { accountCode: "SALES-REVENUE",     accountName: "Medicine Sales",            groupCode: "SALES_REVENUE",   category: "SALES",     openingBalanceType: "cr" },
  { accountCode: "MEDICINE-PURCHASE", accountName: "Medicine Purchases",        groupCode: "PURCHASE_COST",   category: "PURCHASE",  openingBalanceType: "dr" },
  { accountCode: "RENT-EXPENSE",      accountName: "Rent Expense",              groupCode: "EXPENSES",        category: "EXPENSE",   openingBalanceType: "dr" },
  { accountCode: "SALARY-EXPENSE",    accountName: "Salaries & Wages",          groupCode: "EXPENSES",        category: "EXPENSE",   openingBalanceType: "dr" },
  { accountCode: "UTILITY-EXPENSE",   accountName: "Electricity & Utilities",   groupCode: "EXPENSES",        category: "EXPENSE",   openingBalanceType: "dr" },
];
