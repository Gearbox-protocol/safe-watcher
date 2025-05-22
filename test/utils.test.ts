import { fetchRetry } from "../src/utils/fetchRetry.js";
import { sleep } from "../src/utils/sleep.js";

// Mock fetch
global.fetch = jest.fn();

describe("fetchRetry", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  test("should fetch successfully on first attempt", async () => {
    const mockResponse = { ok: true };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const response = await fetchRetry("https://example.com");
    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("should retry on failure and succeed", async () => {
    const mockResponse = { ok: true };
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockResponse);

    const response = await fetchRetry("https://example.com", { retries: 1 });
    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("should throw after all retries fail", async () => {
    const error = new Error("Network error");
    (global.fetch as jest.Mock).mockRejectedValue(error);

    await expect(
      fetchRetry("https://example.com", { retries: 2 }),
    ).rejects.toThrow("Network error");
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  test("should validate response if validator provided", async () => {
    const mockResponse = { ok: true };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    const validateResponse = jest.fn().mockImplementation(() => {
      throw new Error("Invalid response");
    });

    await expect(
      fetchRetry("https://example.com", { validateResponse }),
    ).rejects.toThrow("Invalid response");
    expect(validateResponse).toHaveBeenCalledWith(mockResponse);
  }, 10000);
});

describe("sleep", () => {
  test("should wait for specified milliseconds", async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(100);
  });
});
