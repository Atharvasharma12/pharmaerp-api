import { jest } from "@jest/globals";
import coaSeederService from "../../src/modules/finance/chart-of-accounts/services/coaSeeder.service.js";
import AccountGroup from "../../src/modules/finance/chart-of-accounts/models/accountGroup.model.js";
import Account from "../../src/modules/finance/chart-of-accounts/models/account.model.js";

describe("Chart of Accounts Seeder", () => {
  let originalCountDocuments;
  let originalInsertManyGroup;
  let originalInsertManyAccount;

  beforeAll(() => {
    originalCountDocuments = AccountGroup.countDocuments;
    originalInsertManyGroup = AccountGroup.insertMany;
    originalInsertManyAccount = Account.insertMany;
  });

  afterAll(() => {
    AccountGroup.countDocuments = originalCountDocuments;
    AccountGroup.insertMany = originalInsertManyGroup;
    Account.insertMany = originalInsertManyAccount;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should seed default groups and accounts when no groups exist", async () => {
    // Mock existing count of groups to be 0
    AccountGroup.countDocuments = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(0),
    });

    // Mock insertMany for groups
    AccountGroup.insertMany = jest.fn().mockImplementation((payload) => {
      // Simulate returned documents with _id
      return Promise.resolve(
        payload.map((item) => ({
          ...item,
          _id: `mock-group-id-${item.groupCode}`,
        }))
      );
    });

    // Mock insertMany for accounts
    Account.insertMany = jest.fn().mockResolvedValue([]);

    const mockWorkspaceId = "507f1f77bcf86cd799439011";
    const mockCompanyId = "507f1f77bcf86cd799439012";
    const mockUserId = "507f1f77bcf86cd799439013";

    await coaSeederService.seedCompanyChartOfAccounts(mockWorkspaceId, mockCompanyId, mockUserId);

    // Verify countDocuments checked for existing groups
    expect(AccountGroup.countDocuments).toHaveBeenCalledWith({
      companyId: mockCompanyId,
      isDeleted: false,
    });

    // Verify root groups were inserted
    expect(AccountGroup.insertMany).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({
          groupCode: "CASH_BANK",
          parentGroupId: null,
          isSystemGroup: true,
        }),
      ]),
      { session: null }
    );

    // Verify sub-groups were inserted referencing parents
    expect(AccountGroup.insertMany).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          groupCode: "BANK_ACCOUNTS",
          parentGroupId: "mock-group-id-CASH_BANK",
          isSystemGroup: true,
        }),
      ]),
      { session: null }
    );

    // Verify standard accounts were inserted with proper system flags and mapped groups
    expect(Account.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          accountCode: "PETTY-CASH",
          accountGroupId: "mock-group-id-CASH_BANK",
          isSystemAccount: true,
          accountNature: "ASSET",
        }),
        expect.objectContaining({
          accountCode: "COGS",
          accountGroupId: "mock-group-id-COGS_GROUP",
          isSystemAccount: true,
          accountNature: "EXPENSE",
        }),
      ]),
      { session: null }
    );
  });

  it("should skip seeding if company accounts already exist", async () => {
    AccountGroup.countDocuments = jest.fn().mockReturnValue({
      session: jest.fn().mockResolvedValue(5),
    });

    AccountGroup.insertMany = jest.fn();
    Account.insertMany = jest.fn();

    await coaSeederService.seedCompanyChartOfAccounts("ws-123", "co-123", "usr-123");

    expect(AccountGroup.insertMany).not.toHaveBeenCalled();
    expect(Account.insertMany).not.toHaveBeenCalled();
  });
});
