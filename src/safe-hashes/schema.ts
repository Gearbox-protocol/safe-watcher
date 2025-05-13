import type { Address } from "viem";

export interface SafeTxHashesResponse {
  transactionData: {
    multisigAddress: Address;
    to: Address;
    value: number;
    data: `0x${string}`;
    encodedMessage: `0x${string}`;
    method: string | null;
    parameters: string | null;
  };
  legacyLedgerFormat: {
    binaryStringLiteral: string;
  };
  hashes: {
    domainHash: `0x${string}`;
    messageHash: `0x${string}`;
    safeTransactionHash: `0x${string}`;
  };
}
