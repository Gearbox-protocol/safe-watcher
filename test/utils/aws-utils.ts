import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";

import {
  createMockAWSConfig,
  mockAddresses,
  mockSigners,
} from "./config-utils.js";

export const createMockDynamoDBClient = () => {
  const mock = mockClient(DynamoDBClient);
  mock.on(ScanCommand).callsFake(input => {
    if (input.TableName === "addresses") {
      return {
        Items: mockAddresses.map(address => ({
          address: { S: address.address },
          alias: { S: address.alias },
        })),
      };
    } else if (input.TableName === "signers") {
      return {
        Items: mockSigners.map(signer => ({
          address: { S: signer.address },
          alias: { S: signer.alias },
        })),
      };
    }
    throw new Error("Unknown table name");
  });
  return mock;
};

export const createMockSecretsManagerClient = () => {
  const mock = mockClient(SecretsManagerClient);
  mock.on(GetSecretValueCommand).resolves({
    SecretString: JSON.stringify(createMockAWSConfig()),
  });
  return mock;
};
