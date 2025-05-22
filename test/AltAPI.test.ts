jest.mock("../src/utils/index.js", () => ({
  fetchRetry: jest.fn(),
}));

import { expect } from "@jest/globals";
import type { Address, Hash } from "viem";

import { AltAPI } from "../src/safe/AltAPI.js";
import type { ListedSafeTx, SafeTx } from "../src/safe/types.js";
import { fetchRetry } from "../src/utils/index.js";

// Mock data
const mockSafeAddress =
  "rsk:0x0000000000000000000000000000000000000001" as const;
const mockSafeTxHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash;
const mockAddress = "0x0000000000000000000000000000000000000002" as Address;

const mockListedTx: ListedSafeTx = {
  safeTxHash: mockSafeTxHash,
  nonce: 1,
  isExecuted: false,
  confirmations: 0,
  confirmationsRequired: 2,
};

const mockDetailedTx: SafeTx<Address> = {
  safeTxHash: mockSafeTxHash,
  nonce: 1,
  isExecuted: false,
  confirmations: [mockAddress],
  proposer: mockAddress,
  to: mockAddress,
  operation: 0,
  confirmationsRequired: 2,
};

// Mock fetchRetry
const fetchRetryMock = fetchRetry as any;

describe("AltAPI", () => {
  let api: AltAPI;

  beforeEach(() => {
    api = new AltAPI(mockSafeAddress);
    fetchRetryMock.mockReset();
    fetchRetryMock.mockImplementation((url: string) => {
      // For fetchAll and fetchLatest
      if (
        url.includes("multisig-transactions") &&
        !url.includes("0xaaaaaaaa")
      ) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () =>
            Promise.resolve({
              results: [
                {
                  type: "TRANSACTION",
                  transaction: {
                    txInfo: {
                      type: "Transfer",
                      to: { value: mockAddress },
                      dataSize: "0",
                      value: "0",
                      methodName: "transfer",
                      actionCount: 1,
                      isCancellation: false,
                    },
                    id: `multisig_${mockAddress}_${mockSafeTxHash}`,
                    timestamp: Date.now(),
                    txStatus: "AWAITING_CONFIRMATIONS",
                    executionInfo: {
                      type: "MULTISIG",
                      nonce: 1,
                      confirmationsRequired: 2,
                      confirmationsSubmitted: 0,
                      missingSigners: null,
                    },
                    txHash: null,
                  },
                  conflictType: "None",
                },
              ],
              next: null,
              previous: null,
            }),
        } as unknown as Response);
      }
      // For fetchDetailed
      if (url.includes("0xaaaaaaaa")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () =>
            Promise.resolve({
              safeAddress: mockAddress,
              txId: `multisig_${mockAddress}_${mockSafeTxHash}`,
              executedAt: null,
              txStatus: "AWAITING_CONFIRMATIONS",
              txInfo: {
                type: "Transfer",
                to: { value: mockAddress },
                dataSize: "0",
                value: "0",
                methodName: "transfer",
                actionCount: 1,
                isCancellation: false,
              },
              txData: {
                hexData: "0x",
                to: { value: mockAddress },
                value: "0",
                operation: 0,
                trustedDelegateCallTarget: false,
                addressInfoIndex: {},
              },
              txHash: null,
              detailedExecutionInfo: {
                type: "MULTISIG",
                submittedAt: Date.now(),
                nonce: 1,
                safeTxGas: "0",
                baseGas: "0",
                gasPrice: "0",
                gasToken: "0x0000000000000000000000000000000000000000",
                refundReceiver: {
                  value: "0x0000000000000000000000000000000000000000",
                },
                safeTxHash: mockSafeTxHash,
                executor: null,
                signers: [{ value: mockAddress }],
                confirmationsRequired: 2,
                confirmations: [{ signer: { value: mockAddress } }],
                rejectors: [],
                gasTokenInfo: null,
                trusted: true,
                proposer: { value: mockAddress },
                proposedByDelegate: null,
              },
              note: null,
            }),
        } as unknown as Response);
      }
      // Default fallback
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({}),
      } as unknown as Response);
    });
  });

  test("should fetch all transactions", async () => {
    const txs = await api.fetchAll();
    expect(txs).toHaveLength(1);
    expect(txs[0]).toEqual(mockListedTx);
  });

  test("should fetch latest transactions", async () => {
    const txs = await api.fetchLatest();
    expect(txs).toHaveLength(1);
    expect(txs[0]).toEqual(mockListedTx);
  });

  test("should fetch detailed transaction", async () => {
    const tx = await api.fetchDetailed(mockSafeTxHash);
    expect(tx).toEqual(mockDetailedTx);
  });

  test("should handle API errors gracefully", async () => {
    const error = new Error("API Error");
    jest.spyOn(api as any, "fetch").mockRejectedValueOnce(error);
    await expect(api.fetchAll()).resolves.toEqual([]);
  });
});
