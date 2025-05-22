import { Schema } from "../src/config/schema.js";
import {
  formattedAddressesExpected,
  formattedSignersExpected,
} from "./utils/config-utils.js";

describe("Schema validation", () => {
  describe("safeURL", () => {
    test("should accept valid URL", () => {
      const result = Schema.shape.safeURL.safeParse("https://app.safe.global");
      expect(result.success).toBe(true);
    });

    test("should reject invalid URL", () => {
      const result = Schema.shape.safeURL.safeParse("not-a-url");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid url");
      }
    });

    test("should use default value when not provided", () => {
      const result = Schema.shape.safeURL.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("https://app.safe.global");
      }
    });
  });
  describe("pollInterval", () => {
    test("should accept positive integer", () => {
      const result = Schema.shape.pollInterval.safeParse(30);
      expect(result.success).toBe(true);
    });

    test("should reject negative number", () => {
      const result = Schema.shape.pollInterval.safeParse(-1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Number must be greater than 0",
        );
      }
    });

    test("should reject non-integer", () => {
      const result = Schema.shape.pollInterval.safeParse(1.5);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Expected integer, received float",
        );
      }
    });

    test("should use default value when not provided", () => {
      const result = Schema.shape.pollInterval.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(20);
      }
    });
  });

  describe("safeAddresses", () => {
    test("should accept valid safe addresses", () => {
      const result = Schema.shape.safeAddresses.safeParse(
        formattedAddressesExpected,
      );
      expect(result.success).toBe(true);
    });

    test("should reject empty array", () => {
      const result = Schema.shape.safeAddresses.safeParse([]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Array must contain at least 1 element(s)",
        );
      }
    });

    test("should reject invalid address format", () => {
      const result = Schema.shape.safeAddresses.safeParse([
        { "invalid-address": "Test Safe" },
      ]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Invalid Prefixed Safe Address invalid-address",
        );
      }
    });

    test("should reject empty safe name", () => {
      const result = Schema.shape.safeAddresses.safeParse([
        { "eth:0x1234567890123456789012345678901234567890": "" },
      ]);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "String must contain at least 1 character(s)",
        );
      }
    });
  });

  describe("signers", () => {
    test("should accept valid signers", () => {
      const result = Schema.shape.signers.safeParse(formattedSignersExpected);
      expect(result.success).toBe(true);
    });

    test("should reject invalid address format", () => {
      const result = Schema.shape.signers.safeParse({
        "invalid-address": "Test Signer",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Invalid Address invalid-address",
        );
      }
    });

    test("should reject empty signer name", () => {
      const result = Schema.shape.signers.safeParse({
        "0x1234567890123456789012345678901234567890": "",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "String must contain at least 1 character(s)",
        );
      }
    });

    test("should use empty object as default", () => {
      const result = Schema.shape.signers.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
    });
  });

  describe("api", () => {
    test("should accept valid API modes", () => {
      const validModes = ["classic", "alt", "fallback"] as const;
      for (const mode of validModes) {
        const result = Schema.shape.api.safeParse(mode);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(mode);
        }
      }
    });

    test("should reject invalid API mode", () => {
      const result = Schema.shape.api.safeParse("invalid-mode");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Invalid enum value. Expected 'classic' | 'alt' | 'fallback', received 'invalid-mode'",
        );
      }
    });

    test("should use fallback as default", () => {
      const result = Schema.shape.api.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("fallback");
      }
    });
  });

  describe("optional fields", () => {
    test("should accept undefined telegram fields", () => {
      const result = Schema.shape.telegramBotToken.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });

    test("should accept undefined slack fields", () => {
      const result = Schema.shape.slackBotToken.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });
  });
});
