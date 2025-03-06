import { setTimeout } from "node:timers/promises";

import { loadConfig } from "./config/index.js";
import Healthcheck from "./Healthcheck.js";
import logger from "./logger.js";
import { NotificationSender, Slack, Telegram } from "./notifications/index.js";
import SafeWatcher from "./SafeWatcher.js";

async function run() {
  const config = await loadConfig();

  const sender = new NotificationSender();
  await sender.addNotifier(new Telegram(config));

  // add Slack notifier if configured
  if (config.slackWebhookUrl) {
    await sender.addNotifier(
      new Slack({
        webhookUrl: config.slackWebhookUrl,
        safeURL: config.safeURL,
      }),
    );
    console.log("Added notifier");
  }

  const safes = config.safeAddresses.map(async (safe, i) => {
    await setTimeout(1000 * i);
    return new SafeWatcher({
      safe,
      signers: config.signers,
      notifier: sender,
    }).start(config.pollInterval * 1000);
  });
  const healthcheck = new Healthcheck();

  await healthcheck.run();
  await Promise.all(safes);
}

run().catch(e => {
  logger.error(e);
  process.exit(1);
});
