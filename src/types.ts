import type { Address } from "viem";

import type { ListedSafeTx, SafeTx, Signer } from "./safe/index.js";
import type { SafeTxHashesResponse } from "./safe-hashes/index.js";

export type EventType = "created" | "updated" | "executed" | "malicious";

export interface Event {
  name: string;
  chainPrefix: string;
  safe: Address;
  type: EventType;
  tx: SafeTx<Signer>;
  pending: ListedSafeTx[];
}

export interface INotificationSender {
  notify: (event: Event, safeTxHashes: SafeTxHashesResponse) => Promise<void>;
}

export interface INotifier {
  send: (
    event: Event,
    safeTxHashes: SafeTxHashesResponse,
  ) => void | Promise<void>;
}
