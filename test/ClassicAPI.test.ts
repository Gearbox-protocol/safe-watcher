jest.mock("../src/utils/index.js", () => ({
  fetchRetry: jest.fn(),
}));

import { ClassicAPI, normalizeListed } from "../src/safe/ClassicAPI.js";
import { fetchRetry } from "../src/utils/index.js";
import {
  mockAddress,
  mockDetailedTx,
  mockListedTx,
  mockSafeAddress,
  mockSafeTxHash,
} from "./utils/config-utils.js";

const fetchRetryMock = fetchRetry as any;

describe("ClassicAPI", () => {
  let api: ClassicAPI;

  beforeEach(() => {
    api = new ClassicAPI(mockSafeAddress);
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
                  safeTxHash: mockSafeTxHash,
                  nonce: 1,
                  isExecuted: false,
                  confirmationsRequired: 2,
                  confirmations: [],
                  to: mockAddress,
                  operation: 0,
                  proposer: mockAddress,
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
              safeTxHash: mockSafeTxHash,
              nonce: 1,
              isExecuted: false,
              confirmationsRequired: 2,
              confirmations: [{ owner: mockAddress }],
              to: mockAddress,
              operation: 0,
              proposer: mockAddress,
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
});

describe("ClassicAPI branch coverage", () => {
  let api: ClassicAPI;

  test("should throw error if API URL for prefix is missing", async () => {
    const invalidPrefixAddress =
      "unknown:0x0000000000000000000000000000000000000001" as any;
    const api = new ClassicAPI(invalidPrefixAddress);
    await expect(api.fetchAll()).rejects.toThrow(
      "no API URL for chain 'unknown'",
    );
  });

  test("should return cached value in fetchDetailed", async () => {
    api = new ClassicAPI(mockSafeAddress);
    fetchRetryMock.mockReset();
    // First call: fetches and caches
    fetchRetryMock.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () =>
          Promise.resolve({
            safeTxHash: mockSafeTxHash,
            nonce: 1,
            isExecuted: false,
            confirmationsRequired: 2,
            confirmations: [{ owner: mockAddress }],
            to: mockAddress,
            operation: 0,
            proposer: mockAddress,
          }),
      } as unknown as Response);
    });
    const tx1 = await api.fetchDetailed(mockSafeTxHash);
    // Second call: should hit cache, so no fetchRetry call
    fetchRetryMock.mockImplementationOnce(() => {
      throw new Error("Should not be called");
    });
    const tx2 = await api.fetchDetailed(mockSafeTxHash);
    expect(tx2).toEqual(tx1);
  });

  test("should handle paginated fetchAll", async () => {
    api = new ClassicAPI(mockSafeAddress);
    fetchRetryMock.mockReset();
    // First page: has next
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
              },
            ],
            next: "next-page",
            previous: null,
          }),
      } as unknown as Response);
    });
    // Second page: no next
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
                nonce: 2,
                isExecuted: false,
                confirmationsRequired: 2,
                confirmations: [],
                to: mockAddress,
                operation: 0,
                proposer: mockAddress,
              },
            ],
            next: null,
            previous: "prev-page",
          }),
      } as unknown as Response);
    });
    const txs = await api.fetchAll();
    expect(txs).toHaveLength(2);
    expect(txs[0].nonce).toBe(1);
    expect(txs[1].nonce).toBe(2);
  });

  test("should normalize listed transaction with undefined confirmations", () => {
    const tx = {
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
    };
    const normalized = normalizeListed(tx);
    expect(normalized.confirmations).toBe(0);
  });

  test("should handle empty results in fetchAll", async () => {
    api = new ClassicAPI(mockSafeAddress);
    fetchRetryMock.mockReset();
    fetchRetryMock.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () =>
          Promise.resolve({
            results: [],
            next: null,
            previous: null,
          }),
      } as unknown as Response);
    });
    const txs = await api.fetchAll();
    expect(txs).toHaveLength(0);
  });

  test("should handle empty results in fetchLatest", async () => {
    api = new ClassicAPI(mockSafeAddress);
    fetchRetryMock.mockReset();
    fetchRetryMock.mockImplementationOnce(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () =>
          Promise.resolve({
            results: [],
            next: null,
            previous: null,
          }),
      } as unknown as Response);
    });
    const txs = await api.fetchLatest();
    expect(txs).toHaveLength(0);
  });
});
