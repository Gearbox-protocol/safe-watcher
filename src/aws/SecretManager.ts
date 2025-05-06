import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import logger from "../logger.js";
import type { SecretStored } from "./index.js";

export async function getSecrets(): Promise<SecretStored> {
  const secretsManagerClient = new SecretsManagerClient({
    region: "us-east-2",
  });
  const command = new GetSecretValueCommand({
    SecretId: "safe-watcher-config",
  });
  try {
    const response = await secretsManagerClient.send(command);
    if (response.SecretString) {
      try {
        const parsedSecret = JSON.parse(response.SecretString);
        const secret: SecretStored = {
          slackBotToken: parsedSecret.slackBotToken,
          slackChannelId: parsedSecret.slackChannelId,
          safeAddressesTable: parsedSecret.safeAddressesTable,
          safeSignersTable: parsedSecret.safeSignersTable,
        };
        logger.info("Secret retrieved successfully");
        return secret;
      } catch (error) {
        logger.error("Error parsing secret", error);
        throw new Error("Error parsing secret");
      }
    } else {
      logger.error("SecretString is undefined");
      throw new Error("SecretString is undefined");
    }
  } catch (error) {
    logger.error("Error retrieving secret", error);
    throw new Error("Error retrieving secret");
  }
}
