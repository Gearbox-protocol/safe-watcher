// Mock setTimeout from node:timers/promises before importing the code that uses it
jest.mock("node:timers/promises", () => ({
  setTimeout: jest.fn(() => Promise.resolve()),
}));

import { jest } from "@jest/globals";

import { ConfigManager } from "../src/config/index.js";
import { handleSafeAddress, initializeWatchers, run } from "../src/index.js";
import * as indexModule from "../src/index.js";
import logger from "../src/logger.js";
import { NotificationSender } from "../src/notifications/index.js";
import SafeWatcher from "../src/SafeWatcher.js";
import {
  defaultMockConfig,
  mockAnotherSafeAddressWithAlias,
  mockSafeAddress,
  mockSafeAddressWithAlias,
} from "./utils/config-utils.js";

// Mock dependencies
jest.mock("../src/config/ConfigManager.js");
jest.mock("../src/SafeWatcher.js");
jest.mock("../src/notifications/index.js", () => {
  function NotificationSender() {}
  NotificationSender.prototype.addNotifier = jest
    .fn()
    .mockImplementation(() => Promise.resolve());
  NotificationSender.prototype.notify = jest
    .fn()
    .mockImplementation(() => Promise.resolve());
  class Telegram {
    send = jest.fn().mockImplementation(() => Promise.resolve());
  }
  class Slack {
    send = jest.fn().mockImplementation(() => Promise.resolve());
  }
  return { NotificationSender, Telegram, Slack };
});
jest.mock("@vlad-yakovlev/telegram-md", () => ({
  __esModule: true,
  Telegram: class {
    send = jest.fn().mockImplementation(() => Promise.resolve());
  },
  default: class {
    send = jest.fn().mockImplementation(() => Promise.resolve());
  },
}));
jest.mock("nanoid", () => ({
  customAlphabet: () => () => "mocked-nanoid",
}));

// Mock Healthcheck to prevent server from starting
jest.mock("../src/Healthcheck.js", () => ({
  __esModule: true,
  default: class {
    run = jest.fn().mockImplementation(() => Promise.resolve());
  },
}));

const originalExit = process.exit;

beforeAll(() => {
  process.exit = jest.fn() as any;
});

afterAll(() => {
  process.exit = originalExit;
});

describe("index.ts", () => {
  let mockSender;
  let mockWatcher;

  beforeEach(() => {
    jest.resetAllMocks();
    // Use the imported mockConfig, but ensure it has all notifier properties
    mockSender = {
      addNotifier: jest.fn().mockImplementation(() => Promise.resolve()),
      notify: jest.fn().mockImplementation(() => Promise.resolve()),
    };
    mockWatcher = {
      start: jest.fn().mockImplementation(() => Promise.resolve()),
      stop: jest.fn().mockImplementation(() => Promise.resolve()),
      getPollInterval: jest.fn().mockReturnValue(5000),
      getSafeAddress: jest.fn().mockReturnValue(mockSafeAddress),
    };
    // Mock SafeWatcher constructor
    (SafeWatcher as jest.Mock).mockImplementation(() => mockWatcher);
    // Mock ConfigManager.prototype.initialize with all notifier properties
    jest.spyOn(ConfigManager.prototype, "initialize").mockResolvedValue({
      ...defaultMockConfig,
      telegramBotToken: "test-token",
      telegramChannelId: "test-channel",
      slackBotToken: "test-slack-token",
      slackChannelId: "test-slack-channel",
    });
  });

  test("handleSafeAddress should update existing watcher if poll interval changes", async () => {
    mockWatcher.getPollInterval.mockReturnValue(10000); // 10s, different from config.pollInterval*1000
    const existingWatchers = new Map([[mockSafeAddress, mockWatcher]]);
    await handleSafeAddress(
      mockSafeAddressWithAlias,
      0,
      defaultMockConfig,
      existingWatchers,
      mockSender,
    );
    expect(mockWatcher.stop).toHaveBeenCalled();
    expect(mockWatcher.start).toHaveBeenCalledWith(30000);
  });

  test("handleSafeAddress should create new watcher for new addresses", async () => {
    const existingWatchers = new Map();
    await handleSafeAddress(
      mockSafeAddressWithAlias,
      1,
      defaultMockConfig,
      existingWatchers,
      mockSender,
    );
    expect(SafeWatcher).toHaveBeenCalledWith({
      safe: mockSafeAddressWithAlias,
      signers: defaultMockConfig.signers,
      notifier: mockSender,
    });
    expect(mockWatcher.start).toHaveBeenCalledWith(30000);
  });

  test("initializeWatchers should stop watchers for addresses not in config", async () => {
    // Set up mockConfig with a different address than the watcher
    const mockConfigWithDifferentAddress = {
      ...defaultMockConfig,
      safeAddresses: [mockSafeAddressWithAlias] as [
        Partial<Record<`${string}:0x${string}`, string>>,
        ...Partial<Record<`${string}:0x${string}`, string>>[],
      ],
      telegramBotToken: "test-token",
      telegramChannelId: "test-channel",
      slackBotToken: "test-slack-token",
      slackChannelId: "test-slack-channel",
    };

    await initializeWatchers(defaultMockConfig, mockSender);
    await initializeWatchers(mockConfigWithDifferentAddress, mockSender);
    expect(mockWatcher.stop).toHaveBeenCalled();
  });

  test("run should initialize config and set up notifications", async () => {
    const addNotifierSpy = jest.spyOn(
      NotificationSender.prototype,
      "addNotifier",
    );
    await run();
    expect(ConfigManager.prototype.initialize).toHaveBeenCalled();
    expect(addNotifierSpy).toHaveBeenCalled();
  });

  test("run should handle graceful shutdown", async () => {
    // Directly invoke the SIGTERM handler from the module
    const sigtermHandler = process
      .listeners("SIGTERM")
      .find(fn => fn.name === "" || fn.name === "bound ");
    // Ensure the watcher is properly mocked
    mockWatcher.stop.mockImplementation(() => Promise.resolve());
    (indexModule as any).watchers = [mockWatcher];
    await run();
    if (sigtermHandler) {
      await sigtermHandler("SIGTERM");
      expect(mockWatcher.stop).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(0);
    } else {
      throw new Error("SIGTERM handler not found");
    }
  });

  test("should handle config reload by reinitializing watchers", async () => {
    const newConfig = {
      ...defaultMockConfig,
      safeAddresses: [mockSafeAddressWithAlias] as [
        Partial<Record<`${string}:0x${string}`, string>>,
        ...Partial<Record<`${string}:0x${string}`, string>>[],
      ],
      telegramBotToken: "new-token",
      telegramChannelId: "new-channel",
      slackBotToken: "new-slack-token",
      slackChannelId: "new-slack-channel",
    };

    // Mock the setupConfigReload method
    const setupConfigReloadSpy = jest.spyOn(
      ConfigManager.prototype,
      "setupConfigReload",
    );

    await run();

    // Verify setupConfigReload was called
    expect(setupConfigReloadSpy).toHaveBeenCalled();

    // Get the callback function that was passed to setupConfigReload
    const reloadCallback = setupConfigReloadSpy.mock.calls[0][0];

    // Call the callback with new config
    await reloadCallback(newConfig);

    // Verify that SafeWatcher was called with new config
    expect(SafeWatcher).toHaveBeenCalledWith({
      safe: mockSafeAddressWithAlias,
      signers: newConfig.signers,
      notifier: expect.any(Object),
    });
  });

  test("run should set up both Telegram and Slack notifiers when configured", async () => {
    jest
      .spyOn(ConfigManager.prototype, "initialize")
      .mockResolvedValue(defaultMockConfig);
    const addNotifierSpy = jest.spyOn(
      NotificationSender.prototype,
      "addNotifier",
    );

    await run();
    expect(addNotifierSpy).toHaveBeenCalledTimes(2);
    expect(addNotifierSpy).toHaveBeenCalledWith(expect.any(Object)); // Telegram
    expect(addNotifierSpy).toHaveBeenCalledWith(expect.any(Object)); // Slack
  });

  test("handleSafeAddress should create watchers with correct configuration", async () => {
    const existingWatchers = new Map();

    // Create two watchers with different indices
    await handleSafeAddress(
      mockSafeAddressWithAlias,
      0,
      defaultMockConfig,
      existingWatchers,
      mockSender,
    );
    await handleSafeAddress(
      mockAnotherSafeAddressWithAlias,
      1,
      defaultMockConfig,
      existingWatchers,
      mockSender,
    );

    // Verify SafeWatcher was called with correct config
    expect(SafeWatcher).toHaveBeenCalledTimes(2);
    expect(SafeWatcher).toHaveBeenNthCalledWith(1, {
      safe: mockSafeAddressWithAlias,
      signers: defaultMockConfig.signers,
      notifier: mockSender,
    });
    expect(SafeWatcher).toHaveBeenNthCalledWith(2, {
      safe: mockAnotherSafeAddressWithAlias,
      signers: defaultMockConfig.signers,
      notifier: mockSender,
    });

    // Verify watchers were started
    expect(mockWatcher.start).toHaveBeenCalledTimes(2);
    expect(mockWatcher.start).toHaveBeenCalledWith(30000);
  });

  test("run should handle initialization errors", async () => {
    const error = new Error("Initialization failed");
    jest.spyOn(ConfigManager.prototype, "initialize").mockRejectedValue(error);
    // Mock logger.error before calling run
    const loggerErrorSpy = jest
      .spyOn(logger, "error")
      .mockImplementation(() => {});
    // Mock process.exit to prevent test termination
    const originalExit = process.exit;
    process.exit = jest.fn() as any;
    try {
      await run().catch(() => {});
      expect(loggerErrorSpy).toHaveBeenCalledWith(error);
      expect(process.exit).toHaveBeenCalledWith(1);
    } finally {
      process.exit = originalExit;
      jest.restoreAllMocks();
    }
  });

  test("handleSafeAddress should handle watcher stop errors gracefully", async () => {
    mockWatcher.stop.mockRejectedValue(new Error("Stop failed"));
    const existingWatchers = new Map([[mockSafeAddress, mockWatcher]]);
    mockWatcher.getPollInterval.mockReturnValue(10000); // Different from config

    // Should not throw
    await handleSafeAddress(
      mockSafeAddressWithAlias,
      0,
      defaultMockConfig,
      existingWatchers,
      mockSender,
    );

    // Verify that stop was called
    expect(mockWatcher.stop).toHaveBeenCalled();

    // Verify that a new watcher was created
    expect(SafeWatcher).toHaveBeenCalledWith({
      safe: mockSafeAddressWithAlias,
      signers: defaultMockConfig.signers,
      notifier: mockSender,
    });
  });
});
