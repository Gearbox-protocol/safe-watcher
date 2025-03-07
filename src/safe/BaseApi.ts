import type { Logger } from "pino";
import type { Address } from "viem";
import { getAddress } from "viem";

import type { PrefixedAddress } from "../config/index.js";
import { parsePrefixedAddress } from "../config/index.js";
import logger from "../logger.js";
import { fetchRetry } from "../utils/index.js";

export abstract class BaseApi {
  protected readonly logger: Logger;
  protected readonly address: Address;
  protected readonly prefix: string;

  constructor(safe: PrefixedAddress) {
    const [prefix, address] = parsePrefixedAddress(safe);
    this.address = getAddress(address);
    this.prefix = prefix;
    this.logger = logger.child({ prefix, address });
  }

  protected async fetch(url: string): Promise<any> {
    this.logger.debug(`fetching ${url}`);
    const resp = await fetchRetry(url, {
      retries: 20,
      validateResponse: r => {
        if (!r.ok) {
          throw new Error(`invalid response status: ${r.status}`);
        }
        const ct = r.headers.get("Content-Type");
        if (!ct?.includes("application/json")) {
          throw new Error(`invalid content type: ${ct}`);
        }
      },
    });
    const data = await resp.json();
    return data;
  }
}
