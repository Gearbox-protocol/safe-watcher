import { exec } from "child_process";
import type { Address } from "viem";

import logger from "../logger.js";
import { NETWORKS } from "./constants.js";
import type { SafeTxHashesResponse } from "./index.js";

export function SafeTxHashes(
  prefix: string,
  address: Address,
  nonce: number,
): Promise<string> {
  const network = NETWORKS[prefix];
  return new Promise<string>((resolve, reject) => {
    exec(
      `/app/safe-tx-hashes.sh --network ${network} --address ${address} --nonce ${nonce}`,
      (error, stdout, stderr) => {
        if (error) {
          logger.error(`error: ${error.message}`);
          reject(new Error(`Error executing script: ${error.message}`));
          return;
        }
        if (stderr) {
          logger.error(`stderr: ${stderr}`);
          reject(new Error(`Error executing script: ${stderr}`));
          return;
        }
        logger.debug("stdout:", stdout);
        resolve(stdout as string);
      },
    );
  });
}

export function parseResponse(response: string): SafeTxHashesResponse {
  const lines = response.split("\n");
  const extract = (key: string) =>
    lines.find(line => line.includes(key))?.split(": ")[1] || "";

  return {
    transactionData: {
      multisigAddress: extract("Multisig address") as Address,
      to: extract("To") as Address,
      value: parseInt(extract("Value"), 10),
      data: extract("Data") as `0x${string}`,
      encodedMessage: extract("Encoded message") as `0x${string}`,
      method: extract("Method") || null,
      parameters: extractParameters(lines),
    },
    legacyLedgerFormat: {
      binaryStringLiteral: extract("Binary string literal"),
    },
    hashes: {
      domainHash: extract("Domain hash") as `0x${string}`,
      messageHash: extract("Message hash") as `0x${string}`,
      safeTransactionHash: extract("Safe transaction hash") as `0x${string}`,
    },
  };
}

function extractParameters(lines: string[]): string | null {
  const start = lines.findIndex(line => line.includes("Parameters: [")) + 1;
  const end = lines.findIndex(
    line => line.includes("Legacy Ledger Format"),
    start,
  );
  return start > 0 && end > start
    ? lines.slice(start, end - 2).join("\n")
    : null;
}
