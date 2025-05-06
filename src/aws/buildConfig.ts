import { Schema } from "../config/schema.js";
import type { SecretStored } from "./index.js";
import { getItems, getSecrets } from "./index.js";

export async function buildConfig(): Promise<Schema> {
  const secretStored: SecretStored = await getSecrets();
  const addresses = await getItems(secretStored.safeAddressesTable);
  const signers = await getItems(secretStored.safeSignersTable);
  const schema: Schema = {
    slackBotToken: secretStored.slackBotToken,
    slackChannelId: secretStored.slackChannelId,
    safeAddresses: formatAddress(addresses),
    safeSigners: formatSigners(signers),
  };

  return Schema.parse(schema);
}

function formatAddress(
  addresses: { address: string; alias: string }[],
): { [key: string]: string }[] {
  return addresses.map((item: { address: string; alias: string }) => ({
    [item.address]: item.alias,
  }));
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
    {},
  );
}
