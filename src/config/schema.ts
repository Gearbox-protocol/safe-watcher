import { Address } from "abitype/zod";
import { z } from "zod";

import { SafeAPIMode } from "../safe/schema.js";

export type PrefixedAddress = `${string}:0x${string}`;

export const PrefixedAddress = z.string().transform((val, ctx) => {
  const regex = /^[a-zA-Z0-9]+:0x[a-fA-F0-9]{40}$/;

  if (!regex.test(val)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid Prefixed Safe Address ${val}`,
    });
  }

  return val as PrefixedAddress;
});

export const Schema = z.object({
  /**
   * URL of the Safe web app to generate links in notifications
   */
  safeURL: z.string().url().default("https://app.safe.global"),
  /**
   * Polling interval in seconds
   */
  pollInterval: z.number().int().positive().default(20),
  /**
   * Telegram bot token
   */
  telegramBotToken: z.string(),
  /**
   * Telegram channel ID
   */
  telegramChannelId: z.string(),
  /**
   * Slack webhook URL for notifications (optional)
   */
  slackWebhookUrl: z.string().url().optional(),
  /**
   * Prefixed safe addresses to watch, e.g. `eth:0x11111`
   */
  safeAddresses: z.array(PrefixedAddress).min(1),
  /**
   * Mapping of signer address to human-readable name
   */
  signers: z.record(Address, z.string().min(1)).default({}),
  /**
   * Which safe API to use
   */
  api: SafeAPIMode.default("fallback"),
});

export type Schema = z.infer<typeof Schema>;
