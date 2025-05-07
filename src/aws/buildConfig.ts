import { Schema } from "../config/schema.js";
import type { SecretStored } from "./index.js";
import { DynamoDB, getSecrets } from "./index.js";

export async function buildConfig(): Promise<Schema> {
  const secretStored: SecretStored = await getSecrets();
  const dynamoDB = new DynamoDB();
  const addresses = (await dynamoDB.getItems(
    secretStored.safeAddressesTable,
  )) as { address: `${string}:0x${string}`; alias: string }[];
  const signers = await dynamoDB.getItems(secretStored.safeSignersTable);
  const schema: Schema = {
    slackBotToken: secretStored.slackBotToken,
    slackChannelId: secretStored.slackChannelId,
    safeAddresses: formatAddress(addresses),
    signers: formatSigners(signers),
    safeURL: "https://app.safe.global",
    pollInterval: 20,
    api: "fallback",
  };

  return Schema.parse(schema);
}

function formatAddress(
  addresses: { address: string; alias: string }[],
): [
  Partial<Record<`${string}:0x${string}`, string>>,
  ...Partial<Record<`${string}:0x${string}`, string>>[],
] {
  return [
    addresses.reduce(
      (acc, item) => {
        if (/^[^:]+:0x[a-fA-F0-9]{40}$/.test(item.address)) {
          acc[item.address as `${string}:0x${string}`] = item.alias;
        }
        return acc;
      },
      Object.create(null) as Partial<Record<`${string}:0x${string}`, string>>,
    ),
  ];
}

function formatSigners(signers: { address: string; alias: string }[]): {
  [key: string]: string;
} {
  return signers.reduce(
    (
      acc: { [key: string]: string },
      item: { address: string; alias: string },
    ) => {
      acc[item.address] = item.alias;
      return acc;
    },
    Object.create(null) as { [key: string]: string },
  );
}
