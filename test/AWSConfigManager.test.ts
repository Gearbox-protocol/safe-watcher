import {
  defaultAWSConfigData,
  expectedFormattedAddresses,
  expectedFormattedSigners,
  mockAddresses,
  mockSigners,
} from "./utils/config-utils.js";

jest.mock("../src/aws/DynamoDB.js", () => ({
  DynamoDB: jest.fn().mockImplementation(() => ({
    getItems: jest.fn().mockImplementation(async (tableName: string) => {
      if (tableName === "addresses") return mockAddresses;
      if (tableName === "signers") return mockSigners;
      throw new Error("Unknown table name");
    }),
  })),
}));

jest.mock("../src/aws/SecretManager.js", () => ({
  getSecrets: jest.fn().mockResolvedValue({
    slackBotToken: defaultAWSConfigData.slackBotToken,
    slackChannelId: defaultAWSConfigData.slackChannelId,
    safeAddressesTable: defaultAWSConfigData.safeAddressesTable,
    safeSignersTable: defaultAWSConfigData.safeSignersTable,
  }),
}));

import { AWSConfigManager } from "../src/aws/index.js";

const getItemsErrorMock = jest
  .fn()
  .mockRejectedValueOnce(new Error("Error fetching items"));
const dynamoDBErrorMock = () => ({ getItems: getItemsErrorMock });
const getSecretsError = () =>
  Promise.reject(new Error("Error retrieving secret"));

describe("AWSConfigManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialize", () => {
    test("should create a new instance with secrets", async () => {
      const manager = await AWSConfigManager.initialize();
      expect(manager).toBeInstanceOf(AWSConfigManager);
    });

    test("should throw error when secrets manager fails", async () => {
      const { getSecrets } = await import("../src/aws/SecretManager.js");
      (getSecrets as jest.Mock).mockImplementationOnce(getSecretsError);
      await expect(AWSConfigManager.initialize()).rejects.toThrow(
        "Error retrieving secret",
      );
    });
  });

  describe("loadConfig", () => {
    test("should load configuration successfully", async () => {
      const manager = await AWSConfigManager.initialize();
      const config = await manager.loadConfig();
      expect(config.slackBotToken).toBe(defaultAWSConfigData.slackBotToken);
      expect(config.slackChannelId).toBe(defaultAWSConfigData.slackChannelId);
      expect(config.safeAddresses).toEqual(expectedFormattedAddresses);
      expect(config.signers).toEqual(expectedFormattedSigners);
    });

    test("should throw error when dynamodb fails", async () => {
      const { DynamoDB } = await import("../src/aws/DynamoDB.js");
      (DynamoDB as jest.Mock).mockImplementationOnce(dynamoDBErrorMock);

      const manager = await AWSConfigManager.initialize();
      await expect(manager.loadConfig()).rejects.toThrow(
        "Error fetching items",
      );
    });
  });

  describe("reloadConfig", () => {
    test("should reload configuration successfully", async () => {
      const manager = await AWSConfigManager.initialize();
      await manager.loadConfig(); // Initial load

      const newConfig = await manager.reloadConfig();
      expect(newConfig.slackBotToken).toBe(defaultAWSConfigData.slackBotToken);
      expect(newConfig.slackChannelId).toBe(
        defaultAWSConfigData.slackChannelId,
      );
      expect(newConfig.safeAddresses).toEqual(expectedFormattedAddresses);
      expect(newConfig.signers).toEqual(expectedFormattedSigners);
    });

    test("should keep current config when reload fails", async () => {
      const manager = await AWSConfigManager.initialize();
      const initialConfig = await manager.loadConfig(); // Initial load

      const { DynamoDB } = await import("../src/aws/DynamoDB.js");
      const mockDynamoDB = new DynamoDB();
      (mockDynamoDB.getItems as jest.Mock).mockRejectedValueOnce(
        new Error("DynamoDB error"),
      );

      const reloadedConfig = await manager.reloadConfig();
      expect(reloadedConfig).toEqual(initialConfig);
    });
  });

  describe("formatAddress", () => {
    test("should format addresses correctly", async () => {
      const configManager = await AWSConfigManager.initialize();
      const formattedAddresses = configManager.formatAddress(mockAddresses);

      expect(formattedAddresses).toHaveLength(3);
      expect(formattedAddresses[0]).toEqual(mockAddresses[0]);
      expect(formattedAddresses[1]).toEqual(mockAddresses[1]);
      expect(formattedAddresses[2]).toEqual(mockAddresses[2]);
    });

    test("should filter out invalid addresses", async () => {
      const configManager = await AWSConfigManager.initialize();
      const addressesWithInvalid = [
        ...mockAddresses,
        { address: "invalid", alias: "test2" },
      ];

      const formattedAddresses =
        configManager.formatAddress(addressesWithInvalid);
      expect(formattedAddresses).toHaveLength(3);
      expect(formattedAddresses[0]).toEqual(mockAddresses[0]);
      expect(formattedAddresses[1]).toEqual(mockAddresses[1]);
      expect(formattedAddresses[2]).toEqual(mockAddresses[2]);
    });
  });

  describe("formatSigners", () => {
    test("should format signers correctly", async () => {
      const manager = await AWSConfigManager.initialize();
      const formatted = manager.formatSigners(mockSigners);

      expect(formatted).toEqual(expectedFormattedSigners);
    });
  });
});
