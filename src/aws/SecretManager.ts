import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

import { Schema } from "../config/schema.js";
import logger from "../logger.js";

export async function getSecrets(): Promise<Schema> {
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
        logger.info(response.SecretString);
        const parsedSecret = Schema.parse(JSON.parse(response.SecretString));
        return parsedSecret;
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
