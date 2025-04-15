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

  return {
    transactionData: {
      multisigAddress: extract("Multisig address", lines) as Address,
      to: extract("To", lines) as Address,
      value: parseInt(extract("Value", lines), 10),
      data: extract("Data", lines) as `0x${string}`,
      encodedMessage: extract("Encoded message", lines) as `0x${string}`,
    },
    legacyLedgerFormat: {
      binaryStringLiteral: extract("Binary string literal", lines) as string,
    },
    hashes: {
      domainHash: extract("Domain hash", lines) as `0x${string}`,
      messageHash: extract("Message hash", lines) as `0x${string}`,
      safeTransactionHash: extract(
        "Safe transaction hash",
        lines,
      ) as `0x${string}`,
    },
  };
}

function extract(key: string, lines: string[]): string {
  return lines.find(line => line.includes(key))?.split(": ")[1] || "";
}
