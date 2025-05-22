import type { Address, Hash } from "viem";

import type { SecretStored } from "../../src/aws/schema.js";
import type { ListedSafeTx, SafeTx } from "../../src/safe/types.js";

export const mockSafeAddress =
  "rsk:0x0000000000000000000000000000000000000001" as const;

export const mockSafeTxHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash;

export const mockAddress =
  "0x0000000000000000000000000000000000000002" as Address;

export const createMockConfig = (overrides = {}) => ({
  safeURL: "https://app.safe.global",
  pollInterval: 30,
  safeAddresses: [
    { "eth:0x1234567890123456789012345678901234567890": "Test Safe" },
  ],
  ...overrides,
});

export const configData = {
  slackBotToken: "xoxb-1234567890-1234567890-1234567890",
  slackChannelId: "C1234567890",
  safeAddressesTable: "addresses",
  safeSignersTable: "signers",
};

export const createMockAWSConfig = (): SecretStored => configData;

export const mockAddresses = [
  { address: "rsk:0x1234567890123456789012345678901234567890", alias: "Alice" },
  { address: "eth:0x0987654321098765432109876543210987654321", alias: "Bob" },
  {
    address: "alg:0x1234567890abcdef1234567890abcdef12345678",
    alias: "Charlie",
  },
];

export const mockSigners = [
  { address: "0x1234567890123456789012345678901234567890", alias: "Alice" },
  { address: "0x0987654321098765432109876543210987654321", alias: "Bob" },
  { address: "0x1234567890abcdef1234567890abcdef12345678", alias: "Charlie" },
];

export const formattedAddressesExpected = [
  { "rsk:0x1234567890123456789012345678901234567890": "Alice" },
  { "eth:0x0987654321098765432109876543210987654321": "Bob" },
  { "alg:0x1234567890abcdef1234567890abcdef12345678": "Charlie" },
];

export const formattedSignersExpected = {
  "0x1234567890123456789012345678901234567890": "Alice",
  "0x0987654321098765432109876543210987654321": "Bob",
  "0x1234567890abcdef1234567890abcdef12345678": "Charlie",
};

export const mockListedTx: ListedSafeTx = {
  safeTxHash: mockSafeTxHash,
  nonce: 1,
  isExecuted: false,
  confirmations: 0,
  confirmationsRequired: 2,
};

export const mockDetailedTx: SafeTx<Address> = {
  safeTxHash: mockSafeTxHash,
  nonce: 1,
  isExecuted: false,
  confirmations: [mockAddress],
  proposer: mockAddress,
  to: mockAddress,
  operation: 0,
  confirmationsRequired: 2,
};
