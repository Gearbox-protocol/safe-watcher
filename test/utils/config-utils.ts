import type { Address, Hash } from "viem";

import type { SecretStored } from "../../src/aws/schema.js";
import type { Schema as Config } from "../../src/config/schema.js";
import type { ListedSafeTx, SafeTx } from "../../src/safe/types.js";

export const mockSafeAddress =
  "rsk:0x0000000000000000000000000000000000000001" as const;

export const mockSafeAddressWithAlias = {
  "rsk:0x0000000000000000000000000000000000000001": "Safe 1",
} as Partial<Record<`${string}:0x${string}`, string>>;

export const mockAnotherSafeAddressWithAlias = {
  "rsk:0x0000000000000000000000000000000000000002": "Safe 2",
} as Partial<Record<`${string}:0x${string}`, string>>;

export const mockSafeTxHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as Hash;

export const mockAddress =
  "0x0000000000000000000000000000000000000002" as Address;

export const mockNewSigner = {
  address: "0x1111111111111111111111111111111111111111",
  alias: "New Signer",
} as { address: string; alias: string };

export const createMockConfig = (overrides: Partial<Config> = {}) => ({
  safeURL: "https://app.safe.global",
  pollInterval: 30,
  safeAddresses: [
    { "eth:0x1234567890123456789012345678901234567890": "Test Safe" },
  ] as [Partial<Record<`${string}:0x${string}`, string>>],
  signers: formattedSignersExpected,
  api: "fallback" as const,
  slackBotToken: "xoxb-1234567890-1234567890-1234567890",
  slackChannelId: "C1234567890",
  telegramBotToken: "test-token",
  telegramChannelId: "test-channel",
  ...overrides,
});

export const mockConfig: Config = createMockConfig();

export const configData = {
  slackBotToken: "xoxb-1234567890-1234567890-1234567890",
  slackChannelId: "C1234567890",
  telegramBotToken: "test-token",
  telegramChannelId: "test-channel",
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
] as { address: string; alias: string }[];

export const mockSigners = [
  { address: "0x1234567890123456789012345678901234567890", alias: "Alice" },
  { address: "0x0987654321098765432109876543210987654321", alias: "Bob" },
  { address: "0x1234567890abcdef1234567890abcdef12345678", alias: "Charlie" },
];

export const formattedAddressesExpected = [
  { "rsk:0x1234567890123456789012345678901234567890": "Alice" },
  { "eth:0x0987654321098765432109876543210987654321": "Bob" },
  { "alg:0x1234567890abcdef1234567890abcdef12345678": "Charlie" },
] as [
  Partial<Record<`${string}:0x${string}`, string>>,
  ...Partial<Record<`${string}:0x${string}`, string>>[],
];

export const formattedExpectedSignersWithNameChanged = {
  "0x1234567890123456789012345678901234567890": "Daniel",
  "0x0987654321098765432109876543210987654321": "Bob",
  "0x1234567890abcdef1234567890abcdef12345678": "Charlie",
} as Partial<Record<`${string}:0x${string}`, string>>;

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
