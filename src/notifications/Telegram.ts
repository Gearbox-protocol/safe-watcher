import type { Markdown } from "@vlad-yakovlev/telegram-md";
import { md } from "@vlad-yakovlev/telegram-md";

import logger from "../logger.js";
import type { Signer } from "../safe/index.js";
import type { Event, EventType, INotifier } from "../types.js";

const ACTIONS: Record<EventType, string> = {
  created: "created",
  updated: "updated",
  executed: "executed",
  malicious: "ALERT! ACTION REQUIRED: MALICIOUS TRANSACTION DETECTED!",
};

const NETWORKS: Record<string, string> = {
  arb1: "Arbitrum",
  eth: "Eth Mainnet",
  gor: "Eth Goerli",
  oeth: "Optimism",
  rsk: "Rootstock Mainnet",
  trsk: "Rootstock Testnet",
};

export interface TelegramOptions {
  safeURL: string;
  telegramBotToken: string;
  telegramChannelId: string;
}

export class Telegram implements INotifier {
  readonly #botToken: string;
  readonly #channelId: string;
  readonly #safeURL: string;

  constructor(opts: TelegramOptions) {
    this.#botToken = opts.telegramBotToken;
    this.#channelId = opts.telegramChannelId;
    this.#safeURL = opts.safeURL;
  }

  public async send(event: Event): Promise<void> {
    const msg = this.#getMessage(event);
    await this.#sendToTelegram(msg.toString());
  }

  #getMessage(event: Event): Markdown {
    const { type, chainPrefix, safe, tx } = event;

    const link = md.link(
      "🔗 transaction",
      `${this.#safeURL}/${chainPrefix}:${safe}/transactions/queue`,
    );
    // const report = md.link(
    //   "📄 tx report",
    //   this.anvilManagerAPI.reportURL(this.#chain.network, [tx.safeTxHash]),
    // );
    const proposer = md`Proposed by: ${printSigner(tx.proposer)}`;
    let confirmations = md.join(tx.confirmations.map(printSigner), ", ");
    confirmations = md`Signed by: ${confirmations}`;

    const msg = md`${ACTIONS[type]} ${NETWORKS[chainPrefix]} multisig [${tx.confirmations.length}/${tx.confirmationsRequired}] with safeTxHash ${md.inlineCode(tx.safeTxHash)} and nonce ${md.inlineCode(tx.nonce)}`;

    const components = [msg, proposer, confirmations];
    const links = [link /* , report */];
    // if (pendingReport) {
    //   links.push(md.link("📄 pending report", pendingReport));
    // }
    components.push(md.join(links, " ‖ "));

    return md.join(components, "\n\n");
  }

  async #sendToTelegram(text: string): Promise<void> {
    if (!this.#botToken || !this.#channelId) {
      logger.warn("telegram messages not configured");
      return;
    }
    const url = `https://api.telegram.org/bot${this.#botToken}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: this.#channelId,
          parse_mode: "MarkdownV2",
          text,
        }),
      });

      if (response.ok) {
        logger.debug("telegram sent successfully");
      } else {
        const err = await response.text();
        throw new Error(`${response.statusText}: ${err}`);
      }
    } catch (err) {
      logger.error({ err, text }, "cannot send to telegram");
    }
  }
}

function printSigner({ address, name }: Signer): Markdown {
  return name ? md.bold(name) : md.inlineCode(address);
}
