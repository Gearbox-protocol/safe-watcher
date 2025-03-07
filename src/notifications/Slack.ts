import { WebClient } from "@slack/web-api";

import logger from "../logger.js";
import { SAFE_API_URLS } from "../safe/constants.js";
import type { Event, INotifier } from "../types.js";

export interface SlackOptions {
  slackBotToken: string;
  slackChannelId: string;
}

interface SlackMessage {
  blocks: object[];
  text: string;
}

export class Slack implements INotifier {
  readonly #apiToken: string;
  readonly #channelId: string;

  constructor(opts: SlackOptions) {
    this.#apiToken = opts.slackBotToken;
    this.#channelId = opts.slackChannelId;
  }

  public async send(event: Event): Promise<void> {
    const message: SlackMessage = this.#formatMessage(event);
    await this.#sendToSlack(message);
  }

  #formatMessage(event: Event): SlackMessage {
    const { type, chainPrefix, safe, tx } = event;

    const blocks = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Transaction ${type}*\nChain: ${chainPrefix}\nSafe: ${safe}\nTx Hash: \`${tx.safeTxHash}\`\nNonce: \`${tx.nonce}\``,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Signatures*: ${tx.confirmations.length}/${tx.confirmationsRequired}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Proposer*: ${this.#formatSigner(tx.proposer)}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Signers*: ${tx.confirmations.map(this.#formatSigner).join(", ")}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Transaction",
            },
            url: `${SAFE_API_URLS[chainPrefix.trim()]}/${chainPrefix.trim()}:${safe}/transactions/queue`,
          },
        ],
      },
    ];

    // Add alert for malicious transactions
    if (type === "malicious") {
      blocks.unshift({
        type: "section",
        text: {
          type: "mrkdwn",
          text: "🚨 *ALERT! ACTION REQUIRED: MALICIOUS TRANSACTION DETECTED!* 🚨",
        },
      });
    }

    const message: SlackMessage = {
      blocks,
      text: `Transaction ${type} [${tx.confirmations.length}/${tx.confirmationsRequired}] with safeTxHash ${tx.safeTxHash}`,
    };
    return message;
  }

  #formatSigner(signer: { address: string; name?: string }): string {
    return signer.name ? `*${signer.name}*` : `\`${signer.address}\``;
  }

  async #sendToSlack(message: SlackMessage): Promise<void> {
    if (!this.#apiToken && !this.#channelId) {
      logger.warn("slack not configured");
      return;
    }

    const webClient = new WebClient(this.#apiToken);

    try {
      const response = await webClient.chat.postMessage({
        channel: this.#channelId,
        text: message.text,
        blocks: message.blocks,
      });

      if (response.ok) {
        logger.debug("slack message sent successfully");
      } else {
        throw new Error(`${response}`);
      }
    } catch (err) {
      logger.error({ err, message }, "cannot send to slack");
    }
  }
}
