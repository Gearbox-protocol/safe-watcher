// test/safe.test.ts
// This file is intended for direct tests of src/safe (SafeApiWrapper, ClassicAPI, AltAPI, BaseApi, etc.)
// Add your unit tests for those classes here.

jest.mock("../src/utils/index.js", () => ({
  fetchRetry: jest.fn(),
}));

import { expect } from "@jest/globals";
import type { Address, Hash } from "viem";

import { SafeApiWrapper } from "../src/safe/SafeApiWrapper.js";
import { fetchRetry } from "../src/utils/index.js";

// Mock data
const mockSafeAddress =
  "rsk:0x0000000000000000000000000000000000000001" as const;
const mockSafeTxHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash;
const mockAddress = "0x0000000000000000000000000000000000000002" as Address;

// Mock fetchRetry
const fetchRetryMock = fetchRetry as any;

describe("SafeApiWrapper", () => {
  let wrapper: SafeApiWrapper;

  test("should use classic API when mode is classic", async () => {
    wrapper = new SafeApiWrapper(mockSafeAddress, "classic");
    fetchRetryMock.mockReset();
    fetchRetryMock.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () =>
          Promise.resolve({
            results: [
              {
                safeTxHash: mockSafeTxHash,
                nonce: 1,
                isExecuted: false,
                confirmationsRequired: 2,
                confirmations: [],
                to: mockAddress,
                operation: 0,
                proposer: mockAddress,
                submissionDate: new Date().toISOString(),
                transactionHash: mockSafeTxHash,
              },
            ],
            next: null,
            previous: null,
          }),
      } as unknown as Response);
    });
    const txs = await wrapper.fetchAll();
    expect(txs).toHaveLength(1);
    expect(txs[0].nonce).toBe(1);
  });

  test("should use alt API when mode is alt", async () => {
    wrapper = new SafeApiWrapper(mockSafeAddress, "alt");
    fetchRetryMock.mockReset();
    fetchRetryMock.mockImplementationOnce(() => {
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
    });
    const txs = await wrapper.fetchAll();
    expect(txs).toHaveLength(1);
    expect(txs[0].nonce).toBe(1);
  });

  test("should fallback to alt API when classic API fails", async () => {
    wrapper = new SafeApiWrapper(mockSafeAddress, "fallback");
    fetchRetryMock.mockReset();
    // Classic API fails
    fetchRetryMock.mockImplementationOnce(() => {
      return Promise.reject(new Error("Classic API Error"));
    });
    // Alt API succeeds
    fetchRetryMock.mockImplementationOnce(() => {
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
    });
    const txs = await wrapper.fetchAll();
    expect(txs).toHaveLength(1);
    expect(txs[0].nonce).toBe(1);
  });

  test("should log error when both classic and alt APIs fail", async () => {
    const wrapper = new SafeApiWrapper(mockSafeAddress, "fallback");
    fetchRetryMock.mockImplementationOnce(() => {
      return Promise.reject(new Error("Classic API Error"));
    });
    fetchRetryMock.mockImplementationOnce(() => {
      return Promise.reject(new Error("Alt API Error"));
    });
    const result = await wrapper.fetchAll();
    expect(result).toEqual([]);
  });
});
