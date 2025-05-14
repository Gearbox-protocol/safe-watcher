import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";

import { buildConfig } from "../src/aws/buildConfig.js";
import type { SecretStored } from "../src/aws/schema.js";

const addresses = [
  { address: "rsk:0x1234567890123456789012345678901234567890", alias: "Alice" },
  { address: "eth:0x0987654321098765432109876543210987654321", alias: "Bob" },
  {
    address: "alg:0x1234567890abcdef1234567890abcdef12345678",
    alias: "Charlie",
  },
];

const signers = [
  { address: "0x1234567890123456789012345678901234567890", alias: "Alice" },
  { address: "0x0987654321098765432109876543210987654321", alias: "Bob" },
  { address: "0x1234567890abcdef1234567890abcdef12345678", alias: "Charlie" },
];

const formattedAddressesExpected = [
  { "rsk:0x1234567890123456789012345678901234567890": "Alice" },
  { "eth:0x0987654321098765432109876543210987654321": "Bob" },
  { "alg:0x1234567890abcdef1234567890abcdef12345678": "Charlie" },
];

const formatedSignersExpected = {
  "0x1234567890123456789012345678901234567890": "Alice",
  "0x0987654321098765432109876543210987654321": "Bob",
  "0x1234567890abcdef1234567890abcdef12345678": "Charlie",
};

const storedSecret: SecretStored = {
  slackBotToken: "xoxb-1234567890-1234567890-1234567890",
  slackChannelId: "C1234567890",
  safeAddressesTable: "addresses",
  safeSignersTable: "signers",
};

const ddbMock = mockClient(DynamoDBClient);

ddbMock.on(ScanCommand).callsFake(input => {
  if (input.TableName === "addresses") {
    return {
      Items: addresses.map(address => ({
        address: { S: address.address },
        alias: { S: address.alias },
      })),
    };
  } else if (input.TableName === "signers") {
    return {
      Items: signers.map(signer => ({
        address: { S: signer.address },
        alias: { S: signer.alias },
      })),
    };
  } else {
    throw new Error("Unknown table name");
  }
});

const secMock = mockClient(SecretsManagerClient);

describe("buildConfig", () => {
  test("buildConfig, happy path", async () => {
    secMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({
        slackBotToken: "xoxb-1234567890-1234567890-1234567890",
        slackChannelId: "C1234567890",
        safeAddressesTable: "addresses",
        safeSignersTable: "signers",
      }),
    });
    const config = await buildConfig();
    expect(config.slackBotToken).toBe(storedSecret.slackBotToken);
    expect(config.slackChannelId).toBe(storedSecret.slackChannelId);
    expect(config.safeAddresses).toEqual(formattedAddressesExpected);
    expect(config.signers).toEqual(formatedSignersExpected);
  });

  test("buildConfig, not so happy path, error on secret manager", async () => {
    secMock.on(GetSecretValueCommand).resolves({});
    await expect(buildConfig()).rejects.toThrow("Error retrieving secret");
  });

  test("buildConfig, not so happy path, error on dynamodb", async () => {
    secMock.on(GetSecretValueCommand).resolves({
      SecretString: JSON.stringify({
        slackBotToken: "xoxb-1234567890-1234567890-1234567890",
        slackChannelId: "C1234567890",
        safeAddressesTable: "addresses",
        safeSignersTable: "signers",
      }),
    });

    ddbMock.on(ScanCommand).resolves({});

    await expect(buildConfig()).rejects.toThrow("Error fetching items");
  });
});
