import type { ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

import logger from "../logger.js";

export async function getItems(
  tableName: string,
): Promise<{ address: string; alias: string }[]> {
  const client = new DynamoDBClient({ apiVersion: "2012-08-10" });

  const params: ScanCommandInput = {
    TableName: tableName,
  };

  const command = new ScanCommand(params);
  try {
    const response = await client.send(command);
    if (response.Items) {
      const items = response.Items.map(item => {
        return {
          address: item.address?.S,
          alias: item.alias?.S,
        };
      });
      const filteredItems = items.filter(
        item => item.address && item.alias,
      ) as { address: string; alias: string }[];
      return filteredItems;
    } else {
      logger.debug("No items found");
    }
  } catch (error) {
    logger.error("Error fetching items", error);
  }
  client.destroy();
  return [];
}
