import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

import { AWSConfigManager } from "../src/aws/index.js";
import {
  createMockDynamoDBClient,
  createMockSecretsManagerClient,
} from "./utils/aws-utils.js";
import {
  configData,
  formattedAddressesExpected,
  formattedSignersExpected,
  mockAddresses,
  mockSigners,
} from "./utils/config-utils.js";

describe("AWSConfigManager", () => {
  let ddbMock: ReturnType<typeof createMockDynamoDBClient>;
  let secMock: ReturnType<typeof createMockSecretsManagerClient>;

  beforeEach(() => {
    ddbMock = createMockDynamoDBClient();
    secMock = createMockSecretsManagerClient();
  });

  describe("initialize", () => {
    test("should create a new instance with secrets", async () => {
      const manager = await AWSConfigManager.initialize();
      expect(manager).toBeInstanceOf(AWSConfigManager);
    });

    test("should throw error when secrets manager fails", async () => {
      secMock.on(GetSecretValueCommand).rejects(new Error("Secrets error"));
      await expect(AWSConfigManager.initialize()).rejects.toThrow(
        "Error retrieving secret",
      );
    });
  });

  describe("loadConfig", () => {
    test("should load configuration successfully", async () => {
      const manager = await AWSConfigManager.initialize();
      const config = await manager.loadConfig();

      expect(config.slackBotToken).toBe(configData.slackBotToken);
      expect(config.slackChannelId).toBe(configData.slackChannelId);
      expect(config.safeAddresses).toEqual(formattedAddressesExpected);
      expect(config.signers).toEqual(formattedSignersExpected);
    });

    test("should throw error when dynamodb fails", async () => {
      const manager = await AWSConfigManager.initialize();
      ddbMock.on(ScanCommand).rejects(new Error("DynamoDB error"));
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
      expect(newConfig.slackBotToken).toBe(configData.slackBotToken);
      expect(newConfig.slackChannelId).toBe(configData.slackChannelId);
      expect(newConfig.safeAddresses).toEqual(formattedAddressesExpected);
      expect(newConfig.signers).toEqual(formattedSignersExpected);
    });

    test("should keep current config when reload fails", async () => {
      const manager = await AWSConfigManager.initialize();
      const initialConfig = await manager.loadConfig(); // Initial load

      ddbMock.on(ScanCommand).rejects(new Error("DynamoDB error"));
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

      expect(formatted).toEqual(formattedSignersExpected);
    });
  });
});
