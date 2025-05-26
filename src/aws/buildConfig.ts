import { Schema } from "../config/schema.js";
import logger from "../logger.js";
import type { SecretStored } from "./index.js";
import { DynamoDB, getSecrets } from "./index.js";

export class AWSConfigManager {
  private currentConfig: Schema;
  private dynamoDB: DynamoDB;
  private readonly secrets: SecretStored;

  constructor(secrets: SecretStored) {
    this.dynamoDB = new DynamoDB();
    this.secrets = secrets;
  }

  static async initialize(): Promise<AWSConfigManager> {
    const secrets = await getSecrets();
    return new AWSConfigManager(secrets);
  }

  private validateAndStoreConfig(config: Partial<Schema>): Schema {
    try {
      this.currentConfig = Schema.parse(config);
      return this.currentConfig;
    } catch (error) {
      logger.error({ error }, "Configuration validation failed");
      throw error;
    }
  }

  private async fetchAddressesAndSigners() {
    const [addresses, signers] = await Promise.all([
      this.fetchFormattedAddresses(),
      this.fetchFormattedSigners(),
    ]);

    return { addresses, signers };
  }

  async loadConfig(): Promise<Schema> {
    try {
      logger.info("Loading AWS configuration...");

      const { addresses, signers } = await this.fetchAddressesAndSigners();

      const schema: Schema = {
        slackBotToken: this.secrets.slackBotToken,
        slackChannelId: this.secrets.slackChannelId,
        safeAddresses: addresses,
        signers,
        safeURL: "https://app.safe.global",
        pollInterval: 20,
        api: "fallback",
      };

      return this.validateAndStoreConfig(schema);
    } catch (error) {
      logger.error({ error }, "Failed to load AWS configuration");
      return Promise.reject(error);
    }
  }

  async reloadConfig(): Promise<Schema> {
    try {
      logger.info("Reloading AWS configuration...");

      const { addresses, signers } = await this.fetchAddressesAndSigners();

      const newConfig = {
        ...this.currentConfig,
        safeAddresses: addresses,
        signers,
      };

      return this.validateAndStoreConfig(newConfig);
    } catch (error) {
      logger.error(
        { error },
        "Failed to reload AWS configuration, keeping current config",
      );
      return this.currentConfig;
    }
  }

  async fetchFormattedAddresses(): Promise<
    [
      Partial<Record<`${string}:0x${string}`, string>>,
      ...Partial<Record<`${string}:0x${string}`, string>>[],
    ]
  > {
    const rawAddresses = (await this.dynamoDB.getItems(
      this.secrets.safeAddressesTable,
    )) as {
      address: string;
      alias: string;
    }[];
    logger.debug(rawAddresses);

    return this.formatAddress(rawAddresses).map(item => ({
      [item.address]: item.alias,
    })) as [
      Partial<Record<`${string}:0x${string}`, string>>,
      ...Partial<Record<`${string}:0x${string}`, string>>[],
    ];
  }

  async fetchFormattedSigners(): Promise<{ [key: string]: string }> {
    const rawSigners = await this.dynamoDB.getItems(
      this.secrets.safeSignersTable,
    );
    return this.formatSigners(rawSigners);
  }

  formatAddress(
    addresses: { address: string; alias: string }[],
  ): { address: `${string}:0x${string}`; alias: string }[] {
    return addresses
      .filter(item => /^[^:]+:0x[a-fA-F0-9]{40}$/.test(item.address))
      .map(item => ({
        address: item.address as `${string}:0x${string}`,
        alias: item.alias,
      }));
  }

  formatSigners(signers: { address: string; alias: string }[]): {
    [key: string]: string;
  } {
    return signers.reduce(
      (acc, item) => {
        acc[item.address] = item.alias;
        return acc;
      },
      Object.create(null) as { [key: string]: string },
    );
  }
}
