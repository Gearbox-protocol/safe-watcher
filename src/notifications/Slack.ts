import logger from "../logger.js";
import type { Event, INotifier } from "../types.js";

export interface SlackOptions {
  webhookUrl: string;
  safeURL: string;
}

export class Slack implements INotifier {
  readonly #webhookUrl: string;
  readonly #safeURL: string;

  constructor(opts: SlackOptions) {
    this.#webhookUrl = opts.webhookUrl;
    this.#safeURL = opts.safeURL;
  }

  public async send(event: Event): Promise<void> {
    const message = this.#formatMessage(event);
    await this.#sendToSlack(message);
  }

  #formatMessage(event: Event): object {
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
            url: `${this.#safeURL}/${chainPrefix}:${safe}/transactions/queue`,
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

    return {
      blocks,
      text: `Transaction ${type} [${tx.confirmations.length}/${tx.confirmationsRequired}] with safeTxHash ${tx.safeTxHash}`,
    };
  }

  #formatSigner(signer: { address: string; name?: string }): string {
    return signer.name ? `*${signer.name}*` : `\`${signer.address}\``;
  }

  async #sendToSlack(message: object): Promise<void> {
    if (!this.#webhookUrl) {
      logger.warn("slack webhook not configured");
      return;
    }

    try {
      const response = await fetch(this.#webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        logger.debug("slack message sent successfully");
      } else {
        const err = await response.text();
        throw new Error(`${response.statusText}: ${err}`);
      }
    } catch (err) {
      logger.error({ err, message }, "cannot send to slack");
    }
  }
}
