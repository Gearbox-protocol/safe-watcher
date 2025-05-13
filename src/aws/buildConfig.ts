import { Schema } from "../config/schema.js";
import logger from "../logger.js";
import type { SecretStored } from "./index.js";
import { DynamoDB, getSecrets } from "./index.js";

export async function buildConfig(): Promise<Schema> {
  const secretStored: SecretStored = await getSecrets();
  const dynamoDB = new DynamoDB();

  const addresses = await fetchFormattedAddresses(
    dynamoDB,
    secretStored.safeAddressesTable,
  );
  const signers = await fetchFormattedSigners(
    dynamoDB,
    secretStored.safeSignersTable,
  );

  const schema: Schema = {
    slackBotToken: secretStored.slackBotToken,
    slackChannelId: secretStored.slackChannelId,
    safeAddresses: addresses,
    signers,
    safeURL: "https://app.safe.global",
    pollInterval: 20,
    api: "fallback",
  };

  return Schema.parse(schema);
}

async function fetchFormattedAddresses(
  dynamoDB: DynamoDB,
  tableName: string,
): Promise<
  [
    Partial<Record<`${string}:0x${string}`, string>>,
    ...Partial<Record<`${string}:0x${string}`, string>>[],
  ]
> {
  const rawAddresses = (await dynamoDB.getItems(tableName)) as {
    address: string;
    alias: string;
  }[];
  logger.debug(rawAddresses);

  return formatAddress(rawAddresses).map(item => ({
    [item.address]: item.alias,
  })) as [
    Partial<Record<`${string}:0x${string}`, string>>,
    ...Partial<Record<`${string}:0x${string}`, string>>[],
  ];
}

async function fetchFormattedSigners(
  dynamoDB: DynamoDB,
  tableName: string,
): Promise<{ [key: string]: string }> {
  const rawSigners = await dynamoDB.getItems(tableName);
  return formatSigners(rawSigners);
}

function formatAddress(
  addresses: { address: string; alias: string }[],
): { address: `${string}:0x${string}`; alias: string }[] {
  return addresses
    .filter(item => /^[^:]+:0x[a-fA-F0-9]{40}$/.test(item.address))
    .map(item => ({
      address: item.address as `${string}:0x${string}`,
      alias: item.alias,
    }));
}

function formatSigners(signers: { address: string; alias: string }[]): {
  [key: string]: string;
} {
  return signers.reduce(
    (acc, item) => {
      acc[item.address] = item.alias;
      return acc;
    },
    Object.create(null) as { [key: string]: string },
  );
}
