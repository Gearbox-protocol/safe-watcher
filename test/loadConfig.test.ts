import { writeFileSync } from "fs";
import { join } from "path";
import { dirSync, setGracefulCleanup } from "tmp";
import { loadConfig as zodLoadConfig } from "zod-config";

import { buildConfig, isECS } from "../src/aws/index.js";
import { loadConfig } from "../src/config/loadConfig.js";
import { Schema } from "../src/config/schema.js";
import { createMockConfig } from "./utils/config-utils.js";

// Mock AWS module
jest.mock("../src/aws/index.js", () => ({
  buildConfig: jest.fn(),
  isECS: jest.fn(),
}));

// Mock zod-config
jest.mock("zod-config", () => ({
  loadConfig: jest.fn(),
}));

describe("loadConfig", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = dirSync().name;
    configPath = join(tempDir, "config.yaml");

    // Reset mocks
    jest.clearAllMocks();
    (isECS as jest.Mock).mockReturnValue(false);
    (buildConfig as jest.Mock).mockResolvedValue({});
  });

  afterEach(() => {
    // Clean up temporary files
    setGracefulCleanup();
  });

  test("should load config from local YAML file", async () => {
    // Create a test config file
    const testConfig = createMockConfig();
    writeFileSync(configPath, JSON.stringify(testConfig));

    // Mock process.argv
    const originalArgv = process.argv;
    process.argv = ["node", "test.js", "--config", configPath];

    // Mock zod-config's loadConfig
    (zodLoadConfig as jest.Mock).mockResolvedValue(testConfig);

    const config = await loadConfig();

    expect(config).toEqual(testConfig);
    expect(zodLoadConfig).toHaveBeenCalledWith({
      schema: Schema,
      adapters: expect.any(Array),
    });

    // Restore process.argv
    process.argv = originalArgv;
  });

  test("should use default config path if not specified", async () => {
    // Mock process.argv without --config
    const originalArgv = process.argv;
    process.argv = ["node", "test.js"];

    // Mock zod-config's loadConfig
    (zodLoadConfig as jest.Mock).mockResolvedValue({});

    await loadConfig();

    expect(zodLoadConfig).toHaveBeenCalledWith({
      schema: Schema,
      adapters: expect.any(Array),
    });

    // Restore process.argv
    process.argv = originalArgv;
  });

  test("should load config from AWS when running in ECS", async () => {
    // Mock ECS environment
    (isECS as jest.Mock).mockReturnValue(true);
    (buildConfig as jest.Mock).mockResolvedValue(createMockConfig());

    // Mock zod-config's loadConfig
    (zodLoadConfig as jest.Mock).mockResolvedValue({});

    await loadConfig();

    expect(buildConfig).toHaveBeenCalled();
    expect(zodLoadConfig).toHaveBeenCalledWith({
      schema: Schema,
      adapters: expect.any(Array),
    });
  });

  test("should handle AWS config build failure", async () => {
    // Mock ECS environment
    (isECS as jest.Mock).mockReturnValue(true);
    (buildConfig as jest.Mock).mockRejectedValue(
      new Error("AWS config build failed"),
    );

    // Mock zod-config's loadConfig
    (zodLoadConfig as jest.Mock).mockResolvedValue({});

    await expect(loadConfig()).rejects.toThrow("AWS config build failed");
  });
});
