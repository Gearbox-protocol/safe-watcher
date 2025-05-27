jest.mock("../src/utils/index.js", () => ({
  fetchRetry: jest.fn(),
}));

import { expect } from "@jest/globals";

import { ClassicAPI } from "../src/safe/ClassicAPI.js";
import { fetchRetry } from "../src/utils/index.js";
import {
  mockSafeAddress,
  mockSafeAddressNoPrefix,
  rskPrefix,
} from "./utils/config-utils.js";

const fetchRetryMock = fetchRetry as any;

describe("BaseApi", () => {
  // Helper for fetchRetryMock implementation
  function fetchRetryMockImpl(url: string, opts: any) {
    let response: any;
    if (url.includes("non-200")) {
      response = {
        ok: false,
        status: 404,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({}),
      };
    } else if (url.includes("non-json")) {
      response = {
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "text/plain" }),
        json: () => Promise.resolve({}),
      };
    } else if (url.includes("success")) {
      response = {
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({ test: "data" }),
      };
    } else {
      response = {
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "application/json" }),
        json: () => Promise.resolve({}),
      };
    }
    if (opts && typeof opts.validateResponse === "function") {
      try {
        opts.validateResponse(response);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.resolve(response);
  }

  test("should initialize with correct address and prefix", () => {
    const api = new ClassicAPI(mockSafeAddress);
    expect(api["address"]).toBe(mockSafeAddressNoPrefix);
    expect(api["prefix"]).toBe(rskPrefix);
  });

  test("should throw error for invalid address", () => {
    const invalidAddress = "rsk:0xinvalid" as const;
    expect(() => new ClassicAPI(invalidAddress)).toThrow(
      "invalid prefixed safe address",
    );
  });

  test("should throw error for missing prefix", () => {
    expect(() => new ClassicAPI(mockSafeAddressNoPrefix as any)).toThrow(
      "invalid prefixed safe address",
    );
  });

  describe("fetch", () => {
    let api: ClassicAPI;

    beforeEach(() => {
      api = new ClassicAPI(mockSafeAddress);
      fetchRetryMock.mockReset();
      fetchRetryMock.mockImplementation(fetchRetryMockImpl);
    });

    test("should throw error for non-200 response", async () => {
      await expect(api["fetch"]("non-200")).rejects.toThrow(
        "invalid response status: 404",
      );
    });

    test("should throw error for non-JSON response", async () => {
      await expect(api["fetch"]("non-json")).rejects.toThrow(
        "invalid content type: text/plain",
      );
    });

    test("should successfully fetch and parse JSON response", async () => {
      const result = await api["fetch"]("success");
      expect(result).toEqual({ test: "data" });
    });
  });
});
