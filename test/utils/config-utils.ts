import type { Address, Hash } from "viem";

import type { SecretStored } from "../../src/aws/schema.js";
import type { Schema as Config } from "../../src/config/schema.js";
import type { ListedSafeTx, SafeTx } from "../../src/safe/types.js";

export const mockSafeAddress =
  "rsk:0x0000000000000000000000000000000000000001" as const;

export const mockSafeAddressNoPrefix =
  "0x0000000000000000000000000000000000000001" as Address;

export const rskPrefix = "rsk";

export const mockSafeAddressWithAlias = {
  "rsk:0x0000000000000000000000000000000000000001": "Safe 1",
} as Partial<Record<`${string}:0x${string}`, string>>;

export const mockSafeAddressAlias = "Safe 1";

export const mockAnotherSafeAddressWithAlias = {
  "rsk:0x0000000000000000000000000000000000000002": "Safe 2",
} as Partial<Record<`${string}:0x${string}`, string>>;

export const mockTxHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash;

export const mockAddress =
  "0x0000000000000000000000000000000000000002" as Address;

export const mockSignerAddress = {
  address: "0x1111111111111111111111111111111111111111",
  alias: "New Signer",
} as { address: string; alias: string };

export const createMockConfig = (overrides: Partial<Config> = {}) => ({
  safeURL: "https://app.safe.global",
  pollInterval: 30,
  safeAddresses: [
    { "eth:0x1234567890123456789012345678901234567890": "Test Safe" },
  ] as [Partial<Record<`${string}:0x${string}`, string>>],
  signers: expectedFormattedSigners,
  api: "fallback" as const,
  slackBotToken: "xoxb-1234567890-1234567890-1234567890",
  slackChannelId: "C1234567890",
  telegramBotToken: "test-token",
  telegramChannelId: "test-channel",
  ...overrides,
});

export const defaultMockConfig: Config = createMockConfig();

export const defaultAWSConfigData = {
  slackBotToken: "xoxb-1234567890-1234567890-1234567890",
  slackChannelId: "C1234567890",
  telegramBotToken: "test-token",
  telegramChannelId: "test-channel",
  safeAddressesTable: "addresses",
  safeSignersTable: "signers",
};

export const createMockAWSConfig = (): SecretStored => defaultAWSConfigData;

export const mockAddresses = [
  { address: "rsk:0x1234567890123456789012345678901234567890", alias: "Alice" },
  { address: "eth:0x0987654321098765432109876543210987654321", alias: "Bob" },
  {
    address: "alg:0x1234567890abcdef1234567890abcdef12345678",
    alias: "Charlie",
  },
] as { address: string; alias: string }[];

export const mockSigners = [
  { address: "0x1234567890123456789012345678901234567890", alias: "Alice" },
  { address: "0x0987654321098765432109876543210987654321", alias: "Bob" },
  { address: "0x1234567890abcdef1234567890abcdef12345678", alias: "Charlie" },
];

export const expectedFormattedAddresses = [
  { "rsk:0x1234567890123456789012345678901234567890": "Alice" },
  { "eth:0x0987654321098765432109876543210987654321": "Bob" },
  { "alg:0x1234567890abcdef1234567890abcdef12345678": "Charlie" },
] as [
  Partial<Record<`${string}:0x${string}`, string>>,
  ...Partial<Record<`${string}:0x${string}`, string>>[],
];

export const expectedFormattedSignersWitUpdatedAlias = {
  "0x1234567890123456789012345678901234567890": "Daniel",
  "0x0987654321098765432109876543210987654321": "Bob",
  "0x1234567890abcdef1234567890abcdef12345678": "Charlie",
} as Partial<Record<`${string}:0x${string}`, string>>;

export const expectedFormattedSigners = {
  "0x1234567890123456789012345678901234567890": "Alice",
  "0x0987654321098765432109876543210987654321": "Bob",
  "0x1234567890abcdef1234567890abcdef12345678": "Charlie",
};

export const mockListedTx: ListedSafeTx = {
  safeTxHash: mockTxHash,
  nonce: 1,
  isExecuted: false,
  confirmations: 0,
  confirmationsRequired: 2,
};

export const mockListedAnotherTx: ListedSafeTx = {
  safeTxHash:
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as Hash,
  nonce: 2,
  isExecuted: false,
  confirmations: 1,
  confirmationsRequired: 2,
};

export const mockDetailedTx: SafeTx<Address> = {
  safeTxHash: mockTxHash,
  nonce: 1,
  isExecuted: false,
  confirmations: [mockAddress],
  proposer: mockAddress,
  to: mockAddress,
  operation: 0,
  confirmationsRequired: 2,
};

export const mockMaliciousTx: SafeTx<Address> = {
  ...mockDetailedTx,
  operation: 1,
  to: "0x0000000000000000000000000000000000000004" as Address, // not in any MULTISEND_CALL_ONLY set
};

export const mockSafeHashesResponse = `
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

export const expectedParsedSafeHashesResponse = {
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
} as const;

export const mockSafeHashesResponseNoAdditionalFields = `
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

export const expectedParsedSafeHashesResponseNoAdditionalFields = {
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
};

export const expectedParsedSafeHashesResponseEmpty = {
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
};

export const safeHashesResponseWithMethodAndParameters = `
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

export const safeHashesResponseWithoutMethodAndParameters = `
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

export const expectedParsedSafeHashesResponseWithoutMethodAndParameters = {
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
} as const;

export const expectedParsedSafeHashesResponseWithMethodAndParameters = {
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
} as const;
