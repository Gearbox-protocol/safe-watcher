import type { Address, Hash } from "viem";

import { BaseApi } from "./BaseApi.js";
import { APIS } from "./constants.js";
import type { ISafeAPI, ListedSafeTx, SafeTx } from "./types.js";

// export interface SafeMultisigTransactionResponse {
interface SafeMultisigTransaction {
  // safe: string;
  to: Address;
  // value: string;
  // data: string;
  operation: number;
  // gasToken: string;
  // safeTxGas: number;
  // baseGas: number;
  // gasPrice: string;
  // refundReceiver: string;
  nonce: number;
  executionDate?: string;
  submissionDate: string;
  // modified: Date;
  // blockNumber?: number;
  transactionHash: Hash;
  safeTxHash: Hash;
  // executor: string;
  isExecuted: boolean;
  // isSuccessful?: boolean;
  // ethGasPrice: string;
  // maxFeePerGas: string;
  // maxPriorityFeePerGas: string;
  // gasUsed?: number;
  // fee: string;
  // origin: string;
  // dataDecoded: DataDecoded;
  proposer: Address;
  confirmationsRequired: number;
  confirmations: SafeMultisigConfirmationResponse[];
  // trusted: boolean;
  // signatures: string;
}

interface SafeMultisigConfirmationResponse {
  owner: Address;
  submissionDate: string;
  transactionHash?: Hash;
  signature: Hash;
  signatureType: string;
}

interface SafeMultisigTransactionData {
  /**
   * Total number of transactions
   */
  count: number;
  /**
   * URL to fetch next page
   */
  next?: string | null;
  /**
   * URL to fetch previos page
   */
  previous?: string | null;
  /**
   * Array of results, max 100 results
   */
  results?: SafeMultisigTransaction[];
  countUniqueNonce: number;
}

function normalizeListed(tx: SafeMultisigTransaction): ListedSafeTx {
  return {
    safeTxHash: tx.safeTxHash,
    nonce: tx.nonce,
    confirmations: tx.confirmations?.length ?? 0,
    confirmationsRequired: tx.confirmationsRequired,
    isExecuted: tx.isExecuted,
  };
}

function normalizeDetailed(tx: SafeMultisigTransaction): SafeTx<Address> {
  return {
    safeTxHash: tx.safeTxHash,
    nonce: tx.nonce,
    to: tx.to,
    operation: tx.operation,
    proposer: tx.proposer,
    confirmations: tx.confirmations.map(c => c.owner),
    confirmationsRequired: tx.confirmationsRequired,
    isExecuted: tx.isExecuted,
  };
}

export class ClassicAPI extends BaseApi implements ISafeAPI {
  readonly #txs = new Map<Hash, SafeMultisigTransaction>();

  public async fetchAll(): Promise<ListedSafeTx[]> {
    let url: string | null | undefined;
    const results: SafeMultisigTransaction[] = [];
    do {
      const data = await this.#fetchMany(url);
      results.push(...(data.results ?? []));
      url = data.next;
    } while (url);
    for (const result of results) {
      this.#txs.set(result.safeTxHash, result);
    }
    return results.map(normalizeListed);
  }

  public async fetchLatest(): Promise<ListedSafeTx[]> {
    const data = await this.#fetchMany();
    const txs = data.results ?? [];
    for (const tx of txs) {
      this.#txs.set(tx.safeTxHash, tx);
    }
    return txs.map(normalizeListed);
  }

  public async fetchDetailed(safeTxHash: Hash): Promise<SafeTx<Address>> {
    const cached = this.#txs.get(safeTxHash);
    if (cached) {
      return normalizeDetailed(cached);
    }
    const data = await this.#fetchOne(safeTxHash);
    this.#txs.set(data.safeTxHash, data);
    return normalizeDetailed(data);
  }

  async #fetchMany(url?: string | null): Promise<SafeMultisigTransactionData> {
    const u =
      url ??
      `${this.apiURL}/api/v1/safes/${this.address}/multisig-transactions/`;
    const data = await this.fetch(u);
    return data;
  }

  async #fetchOne(safeTxHash: Hash): Promise<SafeMultisigTransaction> {
    const url = `${this.apiURL}/api/v1/safes/${this.address}/multisig-transactions/${safeTxHash}`;
    const data = await this.fetch(url);
    return data;
  }

  private get apiURL(): string {
    let api = APIS[this.prefix.trim()];
    if (!api) {
      throw new Error(`no API URL for chain '${this.prefix.trim()}'`);
    }
    return api;
  }
}
