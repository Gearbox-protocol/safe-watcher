import logger from "../logger.js";
import type { SafeTxHashesResponse } from "../safe-hashes/index.js";
import type { Event, INotificationSender, INotifier } from "../types.js";

export class NotificationSender implements INotificationSender {
  readonly #notifiers: INotifier[] = [];

  public async addNotifier(notifier: INotifier): Promise<void> {
    this.#notifiers.push(notifier);
  }

  public async notify(
    event: Event,
    safeTxHashes: SafeTxHashesResponse,
  ): Promise<void> {
    logger.debug({ event }, "notifying");
    try {
      await Promise.allSettled(
        this.#notifiers.map(n => n.send(event, safeTxHashes)),
      );
    } catch (e) {
      logger.error(e);
    }
  }
}
