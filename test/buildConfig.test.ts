import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

import { buildConfig } from "../src/aws/buildConfig.js";
import {
  createMockDynamoDBClient,
  createMockSecretsManagerClient,
} from "./utils/aws-utils.js";
import {
  configData,
  formattedAddressesExpected,
  formattedSignersExpected,
} from "./utils/config-utils.js";

describe("buildConfig", () => {
  const ddbMock = createMockDynamoDBClient();
  const secMock = createMockSecretsManagerClient();

  test("buildConfig, happy path", async () => {
    const config = await buildConfig();
    expect(config.slackBotToken).toBe(configData.slackBotToken);
    expect(config.slackChannelId).toBe(configData.slackChannelId);
    expect(config.safeAddresses).toEqual(formattedAddressesExpected);
    expect(config.signers).toEqual(formattedSignersExpected);
  });

  test("buildConfig, not so happy path, error on secret manager", async () => {
    secMock.on(GetSecretValueCommand).resolves({});
    await expect(buildConfig()).rejects.toThrow("Error retrieving secret");
  });

  test("buildConfig, not so happy path, error on dynamodb", async () => {
    ddbMock.on(ScanCommand).resolves({});
    await expect(buildConfig()).rejects.toThrow("Error retrieving secret");
  });
});
