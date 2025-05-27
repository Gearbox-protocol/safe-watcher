import { exec } from "child_process";
import type { Mock } from "jest-mock";

import { NETWORKS } from "../src/safe-hashes/constants.js";
import { parseResponse, SafeTxHashes } from "../src/safe-hashes/index.js";
import {
  expectedParsedSafeHashesResponse,
  expectedParsedSafeHashesResponseEmpty,
  expectedParsedSafeHashesResponseNoAdditionalFields,
  expectedParsedSafeHashesResponseWithMethodAndParameters,
  expectedParsedSafeHashesResponseWithoutMethodAndParameters,
  mockSafeAddressNoPrefix,
  mockSafeHashesResponse,
  mockSafeHashesResponseNoAdditionalFields,
  rskPrefix,
  safeHashesResponseWithMethodAndParameters,
  safeHashesResponseWithoutMethodAndParameters,
} from "./utils/config-utils.js";

type ExecCallback = (
  error: Error | null,
  stdout: string,
  stderr: string,
) => void;

// Mock child_process.exec
jest.mock("child_process", () => ({
  exec: jest.fn(),
}));

describe("SafeTxHashes", () => {
  const mockNonce = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should execute script with correct parameters", async () => {
    const mockStdout = "Success";
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        expect(cmd).toBe(
          `/app/safe-hashes.sh --network ${NETWORKS.rsk} --address ${mockSafeAddressNoPrefix} --nonce ${mockNonce}`,
        );
        (callback as ExecCallback)(null, mockStdout, "");
      },
    );

    const result = await SafeTxHashes(
      rskPrefix,
      mockSafeAddressNoPrefix,
      mockNonce,
    );
    expect(result).toBe(mockStdout);
  });

  test("should reject on script error", async () => {
    const mockError = new Error("Script failed");
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        (callback as ExecCallback)(mockError, "", "");
      },
    );

    await expect(
      SafeTxHashes(rskPrefix, mockSafeAddressNoPrefix, mockNonce),
    ).rejects.toThrow("Error executing script: Script failed");
  });

  test("should reject on stderr output", async () => {
    const mockStderr = "Error: Invalid parameters";
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        (callback as ExecCallback)(null, "", mockStderr);
      },
    );

    await expect(
      SafeTxHashes(rskPrefix, mockSafeAddressNoPrefix, mockNonce),
    ).rejects.toThrow("Error executing script: Error: Invalid parameters");
  });

  test("should support all network prefixes", async () => {
    const mockStdout = "Success";
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        (callback as ExecCallback)(null, mockStdout, "");
      },
    );

    for (const prefix of Object.keys(NETWORKS)) {
      await SafeTxHashes(prefix, mockSafeAddressNoPrefix, mockNonce);
      expect(exec).toHaveBeenCalledWith(
        `/app/safe-hashes.sh --network ${NETWORKS[prefix]} --address ${mockSafeAddressNoPrefix} --nonce ${mockNonce}`,
        expect.any(Function),
      );
    }
  });
});

describe("parseResponse", () => {
  test("should parse valid response", () => {
    const result = parseResponse(mockSafeHashesResponse);
    expect(result).toEqual(expectedParsedSafeHashesResponse);
  });

  test("should handle missing optional fields", () => {
    const result = parseResponse(mockSafeHashesResponseNoAdditionalFields);

    expect(result).toEqual(expectedParsedSafeHashesResponseNoAdditionalFields);
  });

  test("should handle empty response", () => {
    const result = parseResponse("");
    expect(result).toEqual(expectedParsedSafeHashesResponseEmpty);
  });

  test("should handle malformed response", () => {
    const mockResponse = `
Invalid line
Another invalid line
`;

    const result = parseResponse(mockResponse);

    expect(result).toEqual(expectedParsedSafeHashesResponseEmpty);
  });
});

describe("parseResponse (realistic scenarios)", () => {
  test("Parse with method and parameters (realistic)", () => {
    const response = parseResponse(safeHashesResponseWithMethodAndParameters);
    expect(response).toStrictEqual(
      expectedParsedSafeHashesResponseWithMethodAndParameters,
    );
  });

  test("Parse without method and parameters (realistic)", () => {
    const response = parseResponse(
      safeHashesResponseWithoutMethodAndParameters,
    );
    expect(response).toStrictEqual(
      expectedParsedSafeHashesResponseWithoutMethodAndParameters,
    );
  });
});
