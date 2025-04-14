import type { Address, Hash } from "viem";

import type { PrefixedAddress } from "../config/index.js";
import { AltAPI } from "./AltAPI.js";
import { BaseApi } from "./BaseApi.js";
import { ClassicAPI } from "./ClassicAPI.js";
import type { SafeAPIMode } from "./schema.js";
import type { ISafeAPI, ListedSafeTx, SafeTx } from "./types.js";

const methods = ["fetchAll", "fetchLatest", "fetchDetailed"] as Array<
  keyof ISafeAPI
>;

export class SafeApiWrapper extends BaseApi implements ISafeAPI {
  readonly #classic: ISafeAPI;
  readonly #alt: ISafeAPI;

  constructor(safe: PrefixedAddress, mode: SafeAPIMode = "fallback") {
    super(safe);
    this.#classic = new ClassicAPI(safe);
    this.#alt = new AltAPI(safe);
    for (const m of methods) {
      // @ts-ignore */
      this[m] = async (...args: Parameters<ISafeAPI[typeof m]>) => {
        if (mode === "classic") {
          // @ts-ignore */
          return this.#classic[m](...args);
        } else if (mode === "alt") {
          // @ts-ignore */
          return this.#alt[m](...args);
        } else {
          try {
            // @ts-ignore */
            const classic = await Promise.resolve(this.#classic[m](...args));
            return classic;
          } catch (e) {
            this.logger.error(e);
            this.logger.warn("falling back to alternative api");
            // @ts-ignore */
            const alt = await Promise.resolve(this.#alt[m](...args));
            return alt;
          }
        }
      };
    }
  }
  fetchAll: () => Promise<ListedSafeTx[]>;
  fetchLatest: () => Promise<ListedSafeTx[]>;
  fetchDetailed: (safeTxHash: Hash) => Promise<SafeTx<Address>>;
}
