import { setGracefulCleanup } from "tmp";
import { loadConfig as zodLoadConfig } from "zod-config";

import { AWSConfigManager, isECS } from "../src/aws/index.js";
import { ConfigManager, Schema } from "../src/config/index.js";
import {
  createMockConfig,
  expectedFormattedSignersWitUpdatedAlias,
  mockSafeAddressWithAlias,
  mockSignerAddress,
} from "./utils/config-utils.js";

// Mock AWS module
jest.mock("../src/aws/index.js", () => ({
  AWSConfigManager: {
    initialize: jest.fn(),
  },
  isECS: jest.fn(),
}));

// Mock zod-config
jest.mock("zod-config", () => ({
  loadConfig: jest.fn(),
}));

let configManager: ConfigManager;
let mockAWSManager: {
  loadConfig: jest.Mock;
  reloadConfig: jest.Mock;
};

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  (isECS as jest.Mock).mockReturnValue(false);
  mockAWSManager = {
    loadConfig: jest.fn().mockResolvedValue(createMockConfig()),
    reloadConfig: jest.fn().mockResolvedValue(createMockConfig()),
  };
  (AWSConfigManager.initialize as jest.Mock).mockResolvedValue(mockAWSManager);

  configManager = new ConfigManager();
});

afterEach(() => {
  // Clean up temporary files
  setGracefulCleanup();
  // Clear any intervals or timers
  jest.clearAllTimers();
  jest.clearAllMocks();
  // Ensure all intervals are cleared
  if (configManager["configReloadInterval"]) {
    clearInterval(configManager["configReloadInterval"]);
  }
});

describe("initialize", () => {
  test("initialize should load local config when not in ECS", async () => {
    const testConfig = createMockConfig();
    (zodLoadConfig as jest.Mock).mockResolvedValue(testConfig);

    const config = await configManager.initialize();

    expect(config).toEqual(testConfig);
    expect(zodLoadConfig).toHaveBeenCalledWith({
      schema: Schema,
      adapters: expect.any(Array),
    });
  });

  test("initialize should load AWS config when in ECS", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const testConfig = createMockConfig();
    mockAWSManager.loadConfig.mockResolvedValue(testConfig);

    const config = await configManager.initialize();

    expect(config).toEqual(testConfig);
    expect(AWSConfigManager.initialize).toHaveBeenCalled();
  });
});
describe("reloadConfig", () => {
  test("reloadConfig should return undefined when not in ECS", async () => {
    const result = await configManager.reloadConfig();
    expect(result).toBeUndefined();
  });

  test("reloadConfig should reload config when in ECS", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    const newConfig = {
      ...initialConfig,
      safeAddresses: [
        ...initialConfig.safeAddresses,
        mockSafeAddressWithAlias,
      ] as [
        Partial<Record<`${string}:0x${string}`, string>>,
        ...Partial<Record<`${string}:0x${string}`, string>>[],
      ],
      signers: initialConfig.signers,
      api: "fallback" as const,
    };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    mockAWSManager.reloadConfig.mockResolvedValue(newConfig);
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    configManager["currentConfig"] = newConfig;
    expect(result).toEqual(newConfig);
  });

  test("reloadConfig should not reload config because no changes when in ECS", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    expect(result).toEqual(undefined);
  });

  test("reloadConfig should reload with same length but different safe addresses", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    const newConfig = {
      ...initialConfig,
      safeAddresses: [mockSafeAddressWithAlias] as [
        Partial<Record<`${string}:0x${string}`, string>>,
        ...Partial<Record<`${string}:0x${string}`, string>>[],
      ],
      signers: initialConfig.signers,
      api: "fallback" as const,
    };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    mockAWSManager.reloadConfig.mockResolvedValue(newConfig);
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    configManager["currentConfig"] = newConfig;
    expect(result).toEqual(newConfig);
  });

  test("reloadConfig should reload with config with signers different name", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    const newConfig = {
      ...initialConfig,
      safeAddresses: initialConfig.safeAddresses,
      signers: expectedFormattedSignersWitUpdatedAlias,
      api: "fallback" as const,
    };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    mockAWSManager.reloadConfig.mockResolvedValue(newConfig);
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    configManager["currentConfig"] = newConfig;
    expect(result).toEqual(newConfig);
  });

  test("reloadConfig should handle reload errors", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    mockAWSManager.reloadConfig.mockRejectedValue(new Error("Reload failed"));
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    expect(result).toBeUndefined();
  });

  test("reloadConfig should return undefined if awsConfigManager is not set", async () => {
    configManager = new ConfigManager();
    const result = await configManager.reloadConfig();
    expect(result).toBeUndefined();
  });

  test("reloadConfig should handle errors gracefully", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    mockAWSManager.reloadConfig.mockRejectedValue(new Error("Reload failed"));
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    expect(result).toBeUndefined();
  });
});

describe("hasConfigChanged", () => {
  test("hasConfigChanged should detect changes in safe addresses", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    const newConfig = {
      ...initialConfig,
      safeAddresses: [
        ...initialConfig.safeAddresses,
        mockSafeAddressWithAlias,
      ] as [
        Partial<Record<`${string}:0x${string}`, string>>,
        ...Partial<Record<`${string}:0x${string}`, string>>[],
      ],
      signers: initialConfig.signers,
      api: "fallback" as const,
    };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    mockAWSManager.reloadConfig.mockResolvedValue(newConfig);
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    configManager["currentConfig"] = newConfig;
    expect(result).toEqual(newConfig);
  });

  test("hasConfigChanged should detect changes in signers", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    const newConfig = {
      ...initialConfig,
      signers: {
        ...initialConfig.signers,
        mockNewSigner: mockSignerAddress,
      },
      api: "fallback" as const,
    };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    mockAWSManager.reloadConfig.mockResolvedValue(newConfig);
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    configManager["currentConfig"] = newConfig;
    expect(result).toEqual(newConfig);
  });

  test("hasConfigChanged should detect changes in poll interval", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    const initialConfig = { ...createMockConfig(), api: "fallback" as const };
    const newConfig = {
      ...initialConfig,
      pollInterval: initialConfig.pollInterval + 1,
      signers: initialConfig.signers,
      api: "fallback" as const,
    };
    mockAWSManager.loadConfig.mockResolvedValue(initialConfig);
    mockAWSManager.reloadConfig.mockResolvedValue(newConfig);
    configManager = new ConfigManager(mockAWSManager as any);
    await configManager.initialize();
    const result = await configManager.reloadConfig();
    configManager["currentConfig"] = newConfig;
    expect(result).toEqual(newConfig);
  });

  test("hasConfigChanged should return true if currentConfig is undefined", () => {
    const testConfig = createMockConfig();
    // @ts-expect-error: access private
    configManager.currentConfig = undefined;
    expect(configManager["hasConfigChanged"](testConfig)).toBe(true);
  });
});

describe("setupConfigReload", () => {
  test("setupConfigReload should not set up reload when not in ECS", () => {
    const onReload = jest.fn();
    configManager.setupConfigReload(onReload);
    expect(onReload).not.toHaveBeenCalled();
  });

  test("setupConfigReload should set up reload when in ECS", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    await configManager.initialize();
    const onReload = jest.fn();
    const id = configManager.setupConfigReload(onReload);
    expect(id).toBeDefined();
  });

  test("setupConfigReload should handle errors gracefully", async () => {
    (isECS as jest.Mock).mockReturnValue(true);
    await configManager.initialize();
    const onReload = jest.fn();
    mockAWSManager.reloadConfig.mockRejectedValue(new Error("Reload failed"));
    const id = configManager.setupConfigReload(onReload);
    expect(id).toBeDefined();
  });
});

describe("getConfig", () => {
  test("getConfig should return undefined before initialization", () => {
    expect(configManager.getConfig()).toBeUndefined();
  });

  test("getConfig should return config after initialization", async () => {
    const testConfig = createMockConfig();
    (zodLoadConfig as jest.Mock).mockResolvedValue(testConfig);
    await configManager.initialize();
    expect(configManager.getConfig()).toEqual(testConfig);
  });

  test("getConfig should handle errors gracefully", async () => {
    (zodLoadConfig as jest.Mock).mockRejectedValue(new Error("Config error"));
    await expect(configManager.initialize()).rejects.toThrow("Config error");
    expect(configManager.getConfig()).toBeUndefined();
  });
});

describe("loadLocalConfig", () => {
  test("loadLocalConfig should use custom config path if provided", async () => {
    const configManager = new ConfigManager();
    const testConfig = { ...createMockConfig(), api: "fallback" as const };
    (zodLoadConfig as jest.Mock).mockResolvedValue(testConfig);
    const originalArgv = process.argv;
    process.argv = ["node", "test.js", "--config", "custom.yaml"];
    await configManager.initialize();
    expect(zodLoadConfig).toHaveBeenCalledWith({
      schema: Schema,
      adapters: expect.any(Array),
    });
    process.argv = originalArgv;
  });

  test("loadLocalConfig should throw if config file is missing", async () => {
    const configManager = new ConfigManager();
    (zodLoadConfig as jest.Mock).mockImplementation(() => {
      throw new Error("file not found");
    });
    const originalArgv = process.argv;
    process.argv = ["node", "test.js", "--config", "missing.yaml"];
    await expect(configManager.initialize()).rejects.toThrow("file not found");
    process.argv = originalArgv;
  });

  test("loadLocalConfig should use default config path if not provided", async () => {
    const configManager = new ConfigManager();
    const testConfig = { ...createMockConfig(), api: "fallback" as const };
    (zodLoadConfig as jest.Mock).mockResolvedValue(testConfig);
    const originalArgv = process.argv;
    process.argv = ["node", "test.js"];
    await configManager.initialize();
    expect(zodLoadConfig).toHaveBeenCalledWith({
      schema: Schema,
      adapters: expect.any(Array),
    });
    process.argv = originalArgv;
  });
});

describe("stop", () => {
  test("ConfigManager.stop should clear interval if set", () => {
    const configManager = new ConfigManager();
    configManager["configReloadInterval"] = setInterval(() => {}, 1000);
    const clearSpy = jest.spyOn(global, "clearInterval");
    configManager.stop();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  test("ConfigManager.stop should not throw if interval is not set", () => {
    const configManager = new ConfigManager();
    expect(() => configManager.stop()).not.toThrow();
  });
});
