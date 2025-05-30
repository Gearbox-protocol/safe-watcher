import { setTimeout } from "node:timers/promises";

import { ConfigManager } from "./config/index.js";
import Healthcheck from "./Healthcheck.js";
import logger from "./logger.js";
import { NotificationSender, Slack, Telegram } from "./notifications/index.js";
import SafeWatcher from "./SafeWatcher.js";

let watchers: SafeWatcher[] = [];

export async function handleSafeAddress(
  safe: any,
  i: number,
  config: any,
  existingWatchers: Map<string, any>,
  sender: any,
) {
  const address = Object.keys(safe)[0];
  const existingWatcher = existingWatchers.get(address);

  if (existingWatcher) {
    // Update existing watcher if poll interval changed
    if (existingWatcher.getPollInterval() !== config.pollInterval * 1000) {
      try {
        await existingWatcher.stop();
      } catch (error) {
        logger.error(`Failed to stop watcher for ${address}:`, error);
        // Continue with creating a new watcher even if stop fails
      }
      const watcher = new SafeWatcher({
        safe,
        signers: config.signers,
        notifier: sender,
      });
      await watcher.start(config.pollInterval * 1000);
      existingWatchers.set(address, watcher);
    }
  } else {
    // Create new watcher for new addresses
    await setTimeout(1000 * i);
    const watcher = new SafeWatcher({
      safe,
      signers: config.signers,
      notifier: sender,
    });
    await watcher.start(config.pollInterval * 1000);
    existingWatchers.set(address, watcher);
  }
}

export async function initializeWatchers(
  config: Awaited<ReturnType<typeof ConfigManager.prototype.initialize>>,
  sender: NotificationSender,
) {
  // Create a map of existing watchers by address
  const existingWatchers = new Map(watchers.map(w => [w.getSafeAddress(), w]));

  // Create new watchers or update existing ones
  const safes = config.safeAddresses.map((safe, i) =>
    handleSafeAddress(safe, i, config, existingWatchers, sender),
  );

  await Promise.all(safes);

  // Stop watchers for addresses that are no longer in the config
  const currentAddresses = new Set(
    config.safeAddresses.map(s => Object.keys(s)[0]),
  );
  for (const [address, watcher] of existingWatchers) {
    if (!currentAddresses.has(address)) {
      await watcher.stop();
      existingWatchers.delete(address);
    }
  }

  // Update the watchers array with the new state
  watchers = Array.from(existingWatchers.values());
  logger.info("Watchers updated with new configuration");
}

export async function run() {
  try {
    const configManager = new ConfigManager();
    const config = await configManager.initialize();

    const sender = new NotificationSender();
    // add Telegram notifier if configured
    if (config.telegramBotToken && config.telegramChannelId) {
      await sender.addNotifier(
        new Telegram({
          telegramBotToken: config.telegramBotToken,
          telegramChannelId: config.telegramChannelId,
          safeURL: config.safeURL,
        }),
      );
      logger.info("Added notifier Telegram");
    }

    // add Slack notifier if configured
    if (config.slackBotToken && config.slackChannelId) {
      await sender.addNotifier(
        new Slack({
          slackBotToken: config.slackBotToken,
          slackChannelId: config.slackChannelId,
        }),
      );
      logger.info("Added notifier Slack");
    }

    // Initialize watchers
    await initializeWatchers(config, sender);

    // Set up config reload if running in ECS
    configManager.setupConfigReload(async newConfig => {
      await initializeWatchers(newConfig, sender);
    });

    const healthcheck = new Healthcheck();
    await healthcheck.run();
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGTERM", () => {
  logger.info("Received SIGTERM signal");
  for (const watcher of watchers) {
    watcher.stop();
  }
  process.exit(0);
});

// Only run if this file is being executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  run();
}
