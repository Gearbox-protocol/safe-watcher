import { exec } from "child_process";
import type { Mock } from "jest-mock";

import { NETWORKS } from "../src/safe-hashes/constants.js";
import { parseResponse, SafeTxHashes } from "../src/safe-hashes/index.js";

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
  const mockAddress = "0x1234567890123456789012345678901234567890" as const;
  const mockNonce = 1;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should execute script with correct parameters", async () => {
    const mockStdout = "Success";
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        expect(cmd).toBe(
          `/app/safe-hashes.sh --network ${NETWORKS.eth} --address ${mockAddress} --nonce ${mockNonce}`,
        );
        (callback as ExecCallback)(null, mockStdout, "");
      },
    );

    const result = await SafeTxHashes("eth", mockAddress, mockNonce);
    expect(result).toBe(mockStdout);
  });

  test("should reject on script error", async () => {
    const mockError = new Error("Script failed");
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        (callback as ExecCallback)(mockError, "", "");
      },
    );

    await expect(SafeTxHashes("eth", mockAddress, mockNonce)).rejects.toThrow(
      "Error executing script: Script failed",
    );
  });

  test("should reject on stderr output", async () => {
    const mockStderr = "Error: Invalid parameters";
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        (callback as ExecCallback)(null, "", mockStderr);
      },
    );

    await expect(SafeTxHashes("eth", mockAddress, mockNonce)).rejects.toThrow(
      "Error executing script: Error: Invalid parameters",
    );
  });

  test("should support all network prefixes", async () => {
    const mockStdout = "Success";
    (exec as unknown as Mock).mockImplementation(
      (cmd: unknown, callback: unknown) => {
        (callback as ExecCallback)(null, mockStdout, "");
      },
    );

    for (const prefix of Object.keys(NETWORKS)) {
      await SafeTxHashes(prefix, mockAddress, mockNonce);
      expect(exec).toHaveBeenCalledWith(
        `/app/safe-hashes.sh --network ${NETWORKS[prefix]} --address ${mockAddress} --nonce ${mockNonce}`,
        expect.any(Function),
      );
    }
  });
});

describe("parseResponse", () => {
  test("should parse valid response", () => {
    const mockResponse = `
Multisig address: 0x1234567890123456789012345678901234567890
To: 0xabcdef1234567890abcdef1234567890abcdef12
Value: 1000000000000000000
Data: 0x1234567890abcdef
Encoded message: 0xabcdef1234567890
Method: transfer
Parameters: [
  {
    "name": "to",
    "type": "address",
    "value": "0xabcdef1234567890abcdef1234567890abcdef12"
  },
  {
    "name": "value",
    "type": "uint256",
    "value": "1000000000000000000"
  }
]
Legacy Ledger Format
Binary string literal: 0x1234567890abcdef
Domain hash: 0xabcdef1234567890
Message hash: 0x1234567890abcdef
Safe transaction hash: 0xabcdef1234567890
`;

    const result = parseResponse(mockResponse);

    expect(result).toEqual({
      transactionData: {
        multisigAddress: "0x1234567890123456789012345678901234567890",
        to: "0xabcdef1234567890abcdef1234567890abcdef12",
        value: 1000000000000000000,
        data: "0x1234567890abcdef",
        encodedMessage: "0xabcdef1234567890",
        method: "transfer",
        parameters:
          '  {\n    "name": "to",\n    "type": "address",\n    "value": "0xabcdef1234567890abcdef1234567890abcdef12"\n  },\n  {\n    "name": "value",\n    "type": "uint256",\n    "value": "1000000000000000000"',
      },
      legacyLedgerFormat: {
        binaryStringLiteral: "0x1234567890abcdef",
      },
      hashes: {
        domainHash: "0xabcdef1234567890",
        messageHash: "0x1234567890abcdef",
        safeTransactionHash: "0xabcdef1234567890",
      },
    });
  });

  test("should handle missing optional fields", () => {
    const mockResponse = `
Multisig address: 0x1234567890123456789012345678901234567890
To: 0xabcdef1234567890abcdef1234567890abcdef12
Value: 1000000000000000000
Data: 0x1234567890abcdef
Encoded message: 0xabcdef1234567890
Legacy Ledger Format
Binary string literal: 0x1234567890abcdef
Domain hash: 0xabcdef1234567890
Message hash: 0x1234567890abcdef
Safe transaction hash: 0xabcdef1234567890
`;

    const result = parseResponse(mockResponse);

    expect(result).toEqual({
      transactionData: {
        multisigAddress: "0x1234567890123456789012345678901234567890",
        to: "0xabcdef1234567890abcdef1234567890abcdef12",
        value: 1000000000000000000,
        data: "0x1234567890abcdef",
        encodedMessage: "0xabcdef1234567890",
        method: null,
        parameters: null,
      },
      legacyLedgerFormat: {
        binaryStringLiteral: "0x1234567890abcdef",
      },
      hashes: {
        domainHash: "0xabcdef1234567890",
        messageHash: "0x1234567890abcdef",
        safeTransactionHash: "0xabcdef1234567890",
      },
    });
  });

  test("should handle empty response", () => {
    const result = parseResponse("");

    expect(result).toEqual({
      transactionData: {
        multisigAddress: "",
        to: "",
        value: 0,
        data: "",
        encodedMessage: "",
        method: null,
        parameters: null,
      },
      legacyLedgerFormat: {
        binaryStringLiteral: "",
      },
      hashes: {
        domainHash: "",
        messageHash: "",
        safeTransactionHash: "",
      },
    });
  });

  test("should handle malformed response", () => {
    const mockResponse = `
Invalid line
Another invalid line
`;

    const result = parseResponse(mockResponse);

    expect(result).toEqual({
      transactionData: {
        multisigAddress: "",
        to: "",
        value: 0,
        data: "",
        encodedMessage: "",
        method: null,
        parameters: null,
      },
      legacyLedgerFormat: {
        binaryStringLiteral: "",
      },
      hashes: {
        domainHash: "",
        messageHash: "",
        safeTransactionHash: "",
      },
    });
  });
});

describe("parseResponse (realistic scenarios)", () => {
  const response_with_method_and_parameters = `
===================================
= Selected Network Configurations =
===================================

Network: rootstock
Chain ID: 30

========================================
= Transaction Data and Computed Hashes =
========================================

Transaction Data
Multisig address: 0x1234567890123456789012345678901234567890
To: 0x0987654321098765432109876543210987654321
Value: 0
Data: 0x000000000000011111111111222222222222333333333344444444445555555555666666666677777777788888888899999999990
Encoded message: 0xaaabbbcccdddeeefff1111222233334444555566667777888899999aaaabbbbccccdddd
Method: multiSend
Parameters: [
  {
    "name": "transactions",
    "type": "bytes",
    "value": "0x123456789000000000000",
    "valueDecoded": [
      {
        "operation": 0,
        "to": "0x1234567890abcdef1234567890abcdef12345678",
        "value": "0",
        "data": "0x111112222333344445555566667787777aaaababbaa",
        "dataDecoded": {
          "method": "fallback",
          "parameters": []
        }
      },
      {
        "operation": 0,
        "to": "0x1234567890abcdef1234567890abcdef12345678",
        "value": "0",
        "data": "0x1234567890abcdef1234567890abcdef",
        "dataDecoded": {
          "method": "fallback",
          "parameters": []
        }
      }
    ]
  }
]

Legacy Ledger Format
Binary string literal: \\xf5\\xcf\\xb73/\\x95\\xd9\\x1e\\x89?w\\xbb\\xdc\\x87\\xb6T\\x1an\\x9d3n\\x80\\xe8\\xe3\\xd4bn\\x91\\xb5(\\xac\\x8e

Hashes
Domain hash: 0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF
Message hash: 0x1BCDEFGHIJKL1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234
Safe transaction hash: 0x0123456789ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF
`;

  const response_whithout_method_and_parameters = `
===================================
= Selected Network Configurations =
===================================

Network: rootstock
Chain ID: 30

========================================
= Transaction Data and Computed Hashes =
========================================

Transaction Data
Multisig address: 0x1234567890123456789012345678901234567890
To: 0x1234567890abcdef1234567890abcdef12345678
Value: 0
Data: 0x000000230020020020202002000
Encoded message: 0xaaaabbbcccdddeeefff1111222233334444555566667777888899999aaaabbbbccccdddd
Method: fallback
Parameters: []

Legacy Ledger Format
Binary string literal: \\xc5\\x18\\x1f\\x96\\x7f#\\xf1\\x06\\xabn\\xfe\\xba\\x91\\xbd5~\\xcc\\xef\\x86\\xb0\\x8d\\xb4~\\x1b\\xa3\\x9e\\x9b\\x0a\\x9c\\xa7\\x8c\\xc5

Hashes
Domain hash: 0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF
Message hash: 0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210
Safe transaction hash: 0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF
`;

  const expected_answer_1 = {
    transactionData: {
      multisigAddress: "0x1234567890123456789012345678901234567890",
      to: "0x0987654321098765432109876543210987654321",
      value: 0,
      data: "0x000000000000011111111111222222222222333333333344444444445555555555666666666677777777788888888899999999990",
      encodedMessage:
        "0xaaabbbcccdddeeefff1111222233334444555566667777888899999aaaabbbbccccdddd",
      method: "multiSend",
      parameters:
        "  {\n" +
        '    "name": "transactions",\n' +
        '    "type": "bytes",\n' +
        '    "value": "0x123456789000000000000",\n' +
        '    "valueDecoded": [\n' +
        "      {\n" +
        '        "operation": 0,\n' +
        '        "to": "0x1234567890abcdef1234567890abcdef12345678",\n' +
        '        "value": "0",\n' +
        '        "data": "0x111112222333344445555566667787777aaaababbaa",\n' +
        '        "dataDecoded": {\n' +
        '          "method": "fallback",\n' +
        '          "parameters": []\n' +
        "        }\n" +
        "      },\n" +
        "      {\n" +
        '        "operation": 0,\n' +
        '        "to": "0x1234567890abcdef1234567890abcdef12345678",\n' +
        '        "value": "0",\n' +
        '        "data": "0x1234567890abcdef1234567890abcdef",\n' +
        '        "dataDecoded": {\n' +
        '          "method": "fallback",\n' +
        '          "parameters": []\n' +
        "        }\n" +
        "      }\n" +
        "    ]\n" +
        "  }",
    },
    legacyLedgerFormat: {
      binaryStringLiteral:
        "\\xf5\\xcf\\xb73/\\x95\\xd9\\x1e\\x89?w\\xbb\\xdc\\x87\\xb6T\\x1an\\x9d3n\\x80\\xe8\\xe3\\xd4bn\\x91\\xb5(\\xac\\x8e",
    },
    hashes: {
      domainHash:
        "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
      messageHash:
        "0x1BCDEFGHIJKL1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234",
      safeTransactionHash:
        "0x0123456789ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
    },
  };

  const expected_answer_2 = {
    transactionData: {
      multisigAddress: "0x1234567890123456789012345678901234567890",
      to: "0x1234567890abcdef1234567890abcdef12345678",
      value: 0,
      data: "0x000000230020020020202002000",
      encodedMessage:
        "0xaaaabbbcccdddeeefff1111222233334444555566667777888899999aaaabbbbccccdddd",
      method: "fallback",
      parameters: "",
    },
    legacyLedgerFormat: {
      binaryStringLiteral:
        "\\xc5\\x18\\x1f\\x96\\x7f#\\xf1\\x06\\xabn\\xfe\\xba\\x91\\xbd5~\\xcc\\xef\\x86\\xb0\\x8d\\xb4~\\x1b\\xa3\\x9e\\x9b\\x0a\\x9c\\xa7\\x8c\\xc5",
    },
    hashes: {
      domainHash:
        "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
      messageHash:
        "0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210",
      safeTransactionHash:
        "0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF",
    },
  };

  test("Parse with method and parameters (realistic)", () => {
    const response = parseResponse(response_with_method_and_parameters);
    expect(response).toStrictEqual(expected_answer_1);
  });

  test("Parse without method and parameters (realistic)", () => {
    const response = parseResponse(response_whithout_method_and_parameters);
    expect(response).toStrictEqual(expected_answer_2);
  });
});
