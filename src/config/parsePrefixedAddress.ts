import type { Address } from "viem";
import { isAddress } from "viem";

import type { PrefixedAddress } from "./schema.js";

export function parsePrefixedAddress(
  addr: PrefixedAddress,
): [prefix: string, address: Address, name: string] {
  const [name, prefix, address] = addr.split(":");
  if (!isAddress(address)) {
    throw new Error(`invalid prefixed safe address '${addr}'`);
  }
  return [prefix, address, name];
}
