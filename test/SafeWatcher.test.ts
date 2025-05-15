import { expect, jest } from "@jest/globals";
import type { Address, Hash } from "viem";

import type { ISafeAPI, ListedSafeTx, SafeTx } from "../src/safe/types.js";
import SafeWatcher from "../src/SafeWatcher.js";
import type { Event, INotificationSender } from "../src/types.js";

// Mock MULTISEND_CALL_ONLY
jest.mock("../src/safe/constants.js", () => ({
  MULTISEND_CALL_ONLY: new Set(["0x1234def" as Address]),
}));

// Global test constants
const safe = {
  "rsk:0x0000000000000000000000000000000000000001": "Test",
} as const;

// Mock data
const mockSafeTx: ListedSafeTx = {
  safeTxHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash,
  nonce: 1,
  isExecuted: false,
  confirmations: 0,
  confirmationsRequired: 2,
};

const mockSafeTx2: ListedSafeTx = {
  safeTxHash:
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Hash,
  nonce: 2,
  isExecuted: false,
  confirmations: 1,
  confirmationsRequired: 2,
};

const mockDetailedTx: SafeTx<Address> = {
  safeTxHash:
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash,
  nonce: 1,
  isExecuted: false,
  confirmations: ["0x0000000000000000000000000000000000000002" as Address],
  proposer: "0x0000000000000000000000000000000000000002" as Address,
  to: "0x0000000000000000000000000000000000000003" as Address,
  operation: 0,
  confirmationsRequired: 2,
};

const mockMaliciousTx: SafeTx<Address> = {
  ...mockDetailedTx,
  operation: 1,
  to: "0x0000000000000000000000000000000000000004" as Address, // not in any MULTISEND_CALL_ONLY set
};

// Add a signers map for name resolution
const signers = {
  "0x0000000000000000000000000000000000000002": "Alice",
} as const;

// Helper functions for test setup
function createMockApi(
  overrides: Partial<{
    fetchAll: jest.Mock<() => Promise<ListedSafeTx[]>>;
    fetchLatest: jest.Mock<() => Promise<ListedSafeTx[]>>;
    fetchDetailed: jest.Mock<(hash: Hash) => Promise<SafeTx<Address>>>;
  }> = {},
) {
  return {
    fetchAll: jest.fn<() => Promise<ListedSafeTx[]>>().mockResolvedValue([]),
    fetchLatest: jest.fn<() => Promise<ListedSafeTx[]>>().mockResolvedValue([]),
    fetchDetailed: jest
      .fn<(hash: Hash) => Promise<SafeTx<Address>>>()
      .mockResolvedValue(mockDetailedTx),
    ...overrides,
  } as ISafeAPI;
}

function createTestWatcher(
  options: {
    api?: ISafeAPI;
    notifier?: ReturnType<typeof createMockNotifier>["notifier"];
  } = {},
) {
  const { api = createMockApi(), notifier } = options;
  return new SafeWatcher({ safe, api, notifier, signers });
}

// Mock the SafeTxHashes and parseResponse functions
jest.mock("../src/safe-hashes/index.js", () => ({
  SafeTxHashes: () =>
    Promise.resolve(
      `Multisig address: 0xabc\nTo: 0xdef\nValue: 0\nData: 0x\nEncoded message: 0x123\nMethod: null\nParameters: []\nLegacy Ledger Format\nBinary string literal: 0x456\nDomain hash: 0x1\nMessage hash: 0x2\nSafe transaction hash: 0x3`,
    ),
  parseResponse: (x: any) => x,
}));

// Mock the SafeApiWrapper class
jest.mock("../src/safe/index.js", () => {
  const actual = jest.requireActual("../src/safe/index.js");
  // eslint-disable-next-line prefer-object-spread
  return Object.assign({}, actual, {
    SafeApiWrapper: jest.fn().mockImplementation(() => ({
      fetchAll: jest
        .fn<() => Promise<ListedSafeTx[]>>()
        .mockResolvedValue([] as ListedSafeTx[]),
      fetchLatest: jest
        .fn<() => Promise<ListedSafeTx[]>>()
        .mockResolvedValue([] as ListedSafeTx[]),
      fetchDetailed: jest
        .fn<(hash: string) => Promise<SafeTx<`0x${string}`>>>()
        .mockResolvedValue(mockDetailedTx),
    })) as unknown as ISafeAPI,
    MULTISEND_CALL_ONLY: new Set(["0x1234def"]),
  });
});

// Create a simple mock notifier
function createMockNotifier(): {
  notifier: INotificationSender;
  mock: jest.MockedFunction<any>;
} {
  const mock = jest.fn(async (..._args: any[]) => {
    return Promise.resolve();
  });
  return {
    notifier: { notify: mock },
    mock,
  };
}

describe("SafeWatcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    test("should initialize with correct safe address and name", () => {
      const safewatcher = createTestWatcher();
      expect(safewatcher.prefix).toBe("rsk");
      expect(safewatcher.safe).toBe(
        "0x0000000000000000000000000000000000000001",
      );
      expect(safewatcher.name).toBe("Test");
    });

    test("should throw error for invalid safe address", () => {
      const invalidSafe = { "rsk:invalid": "Test" };
      const create = () => new SafeWatcher({ safe: invalidSafe });
      expect(create).toThrow("invalid prefixed safe address 'rsk:invalid'");
    });
  });

  describe("Transaction Monitoring", () => {
    test("should start monitoring and fetch initial transactions", async () => {
      const mockApi = createMockApi({
        fetchAll: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockResolvedValue([mockSafeTx, mockSafeTx2]),
      });
      const safewatcher = createTestWatcher({ api: mockApi });
      await safewatcher.start(0);
      await safewatcher["poll"]();
      safewatcher.stop();
      expect(safewatcher.txs.size).toBe(2);
      expect(
        safewatcher.txs.get(
          "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ),
      ).toBeDefined();
      expect(
        safewatcher.txs.get(
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        ),
      ).toBeDefined();
    });

    test("should detect new transactions", async () => {
      const { notifier, mock } = createMockNotifier();
      const mockApi = createMockApi({
        fetchLatest: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockResolvedValue([mockSafeTx]),
      });
      const watcher = createTestWatcher({ api: mockApi, notifier });
      watcher.txs.clear();
      await watcher.start(0);
      await watcher["poll"]();
      watcher.stop();
      expect(mock).toHaveBeenCalled();
      const event = mock.mock.calls[0][0] as Event;
      expect(event.type).toBe("created");
    });

    test("should detect malicious transactions", async () => {
      const { notifier, mock } = createMockNotifier();
      const mockApi = createMockApi({
        fetchLatest: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockResolvedValue([mockSafeTx]),
        fetchDetailed: jest
          .fn<(hash: Hash) => Promise<SafeTx<Address>>>()
          .mockResolvedValue(mockMaliciousTx),
      });
      const watcher = createTestWatcher({ api: mockApi, notifier });
      watcher.txs.clear();
      await watcher.start(0);
      await watcher["poll"]();
      watcher.stop();
      expect(mock).toHaveBeenCalled();
      const event = mock.mock.calls[0][0] as Event;
      expect(event.type).toBe("malicious");
    });
  });

  describe("Error Handling", () => {
    test("should handle API errors gracefully", async () => {
      const mockApi = createMockApi({
        fetchAll: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockRejectedValue(new Error("API Error")),
        fetchLatest: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockRejectedValue(new Error("API Error")),
        fetchDetailed: jest
          .fn<(hash: Hash) => Promise<SafeTx<Address>>>()
          .mockRejectedValue(new Error("API Error")),
      });
      const safewatcher = createTestWatcher({ api: mockApi });
      await expect(safewatcher.start(0)).rejects.toThrow("API Error");
    });

    test("should handle fetchDetailed errors in poll", async () => {
      const { notifier, mock } = createMockNotifier();
      const mockApi = createMockApi({
        fetchLatest: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockResolvedValue([mockSafeTx]),
        fetchDetailed: jest
          .fn<(hash: Hash) => Promise<SafeTx<Address>>>()
          .mockRejectedValue(new Error("API Error")),
      });
      const watcher = createTestWatcher({ api: mockApi, notifier });

      await watcher.start(0);
      await watcher["poll"]();

      expect(mock).not.toHaveBeenCalled();
    });
  });

  describe("Transaction Processing", () => {
    test("should handle transaction updates correctly", async () => {
      const { notifier, mock } = createMockNotifier();
      const mockApi = createMockApi({
        fetchLatest: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockResolvedValue([mockSafeTx]),
      });
      const watcher = createTestWatcher({ api: mockApi, notifier });

      // First add the transaction
      await watcher.start(0);
      await watcher["poll"]();

      // Then update it
      const updatedTx = { ...mockSafeTx, confirmations: 1 };
      const mockFetchLatest = mockApi.fetchLatest as jest.Mock<
        () => Promise<ListedSafeTx[]>
      >;
      mockFetchLatest.mockResolvedValueOnce([updatedTx]);
      await watcher["poll"]();

      expect(mock).toHaveBeenCalledTimes(2);
      const updateEvent = mock.mock.calls[1][0] as Event;
      expect(updateEvent.type).toBe("updated");
    });

    test("should handle executed transactions", async () => {
      const { notifier, mock } = createMockNotifier();
      const mockApi = createMockApi({
        fetchLatest: jest
          .fn<() => Promise<ListedSafeTx[]>>()
          .mockResolvedValue([mockSafeTx]),
      });
      const watcher = createTestWatcher({ api: mockApi, notifier });

      // First add the transaction
      await watcher.start(0);
      await watcher["poll"]();

      // Then mark it as executed
      const executedTx = { ...mockSafeTx, isExecuted: true };
      const mockFetchLatest = mockApi.fetchLatest as jest.Mock<
        () => Promise<ListedSafeTx[]>
      >;
      mockFetchLatest.mockResolvedValueOnce([executedTx]);
      await watcher["poll"]();

      expect(mock).toHaveBeenCalledTimes(2);
      const executeEvent = mock.mock.calls[1][0] as Event;
      expect(executeEvent.type).toBe("executed");
    });
  });

  describe("Watcher Lifecycle", () => {
    test("should stop polling when stop is called", async () => {
      const watcher = createTestWatcher();

      await watcher.start(100); // Start with 100ms interval
      expect(watcher.interval).toBeDefined();

      watcher.stop();
      expect(watcher.interval).toBeUndefined();
    });

    test("should not start polling with zero interval", async () => {
      const watcher = createTestWatcher();

      await watcher.start(0);
      expect(watcher.interval).toBeUndefined();
    });
  });
});
