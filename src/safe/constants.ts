import type { Address } from "viem";

/**
 * See multi_send_call_only.sol here
 * https://docs.safe.global/advanced/smart-account-supported-networks?service=Transaction+Service&page=2&expand=1
 */
export const MULTISEND_CALL_ONLY = new Set<Address>([
  "0x9641d764fc13c8b624c04430c7356c1c7c8102e2",
  "0x40a2accbd92bca938b02010e17a5b8929b49130d",
]);

export const CHAIN_IDS: Record<string, number> = {
  arb1: 42161,
  eth: 1,
  gor: 5,
  oeth: 10,
  rsk: 30,
  trsk: 31,
};

export const APIS: Record<string, string> = {
  arb1: "https://safe-transaction-arbitrum.safe.global",
  eth: "https://safe-transaction-mainnet.safe.global",
  gor: "https://safe-transaction-goerli.safe.global",
  oeth: "https://safe-transaction-optimism.safe.global",
  rsk: "https://transaction.safe.rootstock.io",
  trsk: "https://transaction.safe.rootstock.io",
};

export const SAFE_API_URLS: Record<string, string> = {
  arb1: "https://safe.global",
  eth: "https://ssafe.global",
  gor: "https://safe.global",
  oeth: "https://safe.global",
  rsk: "https://safe.rootstock.io",
  trsk: "https://safe.rootstock.io",
};
