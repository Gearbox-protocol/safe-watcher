import { loadConfig as load } from "zod-config";
import { envAdapter } from "zod-config/env-adapter";
import { yamlAdapter } from "zod-config/yaml-adapter";

import { AWSConfigManager, isECS } from "../aws/index.js";
import logger from "../logger.js";
import { Schema } from "./schema.js";

export class ConfigManager {
  private configReloadInterval?: NodeJS.Timeout;
  private currentConfig?: Schema;
  private awsConfigManager?: AWSConfigManager;

  constructor(awsConfigManager?: AWSConfigManager) {
    this.awsConfigManager = awsConfigManager;
  }

  async initialize() {
    // Load initial configuration
    if (isECS()) {
      if (!this.awsConfigManager) {
        this.awsConfigManager = await AWSConfigManager.initialize();
      }
      this.currentConfig = await this.awsConfigManager.loadConfig();
    } else {
      this.currentConfig = await this.loadLocalConfig();
    }

    return this.currentConfig;
  }

  private async loadLocalConfig(): Promise<Schema> {
    const cIndex = process.argv.indexOf("--config");
    let path = "config.yaml";
    logger.info("Loading config from local file");
    if (cIndex > 0) {
      path = process.argv[cIndex + 1] || path;
    }
    return load({
      schema: Schema,
      adapters: [yamlAdapter({ path }), envAdapter()],
    }) as Promise<Schema>;
  }

  private hasConfigChanged(newConfig: Schema): boolean {
    if (!this.currentConfig) return true;

    // Compare safe addresses
    if (
      newConfig.safeAddresses.length !== this.currentConfig.safeAddresses.length
    ) {
      return true;
    }

    const currentAddresses = new Set(
      this.currentConfig.safeAddresses.map(a => Object.keys(a)[0]),
    );
    const hasNewAddresses = newConfig.safeAddresses.some(
      a => !currentAddresses.has(Object.keys(a)[0]),
    );
    if (hasNewAddresses) {
      return true;
    }

    // Compare signers
    if (
      Object.keys(newConfig.signers).length !==
      Object.keys(this.currentConfig.signers).length
    ) {
      return true;
    }

    for (const [address, name] of Object.entries(newConfig.signers)) {
      if (this.currentConfig.signers[address] !== name) {
        return true;
      }
    }

    // Compare poll interval
    if (newConfig.pollInterval !== this.currentConfig.pollInterval) {
      return true;
    }

    return false;
  }

  async reloadConfig() {
    try {
      if (!this.awsConfigManager) {
        return;
      }

      const newConfig = await this.awsConfigManager.reloadConfig();
      const hasChanged = this.hasConfigChanged(newConfig);

      if (hasChanged) {
        logger.info("Configuration changes detected, updating...");
        this.currentConfig = newConfig;
        return newConfig;
      } else {
        logger.info("No configuration changes detected");
        return undefined;
      }
    } catch (error) {
      logger.error({ error }, "Failed to reload configuration");
      return undefined;
    }
  }

  getConfig(): Schema | undefined {
    return this.currentConfig;
  }

  setupConfigReload(onReload: (config: Schema) => Promise<void>) {
    if (isECS()) {
      // Set up hourly config reload
      const ONE_HOUR = 60 * 60 * 1000;
      this.configReloadInterval = setInterval(async () => {
        const newConfig = await this.reloadConfig();
        if (newConfig) {
          await onReload(newConfig);
        }
      }, ONE_HOUR);
      logger.info("AWS configuration reload enabled");
      return this.configReloadInterval;
    }
  }

  stop() {
    if (this.configReloadInterval) {
      clearInterval(this.configReloadInterval);
    }
  }
}
