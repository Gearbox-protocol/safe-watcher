import type { ScanCommandInput } from "@aws-sdk/client-dynamodb";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

import logger from "../logger.js";

export class DynamoDB {
  private client: DynamoDBClient;
  constructor() {
    this.client = new DynamoDBClient({});
  }
  public async getItems(
    tableName: string,
  ): Promise<{ address: string; alias: string }[]> {
    const params: ScanCommandInput = {
      TableName: tableName,
    };

    const command = new ScanCommand(params);
    try {
      const response = await this.client.send(command);
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
        logger.debug(`No items found in table: ${tableName}`);
        throw new Error(`No items found in table: ${tableName}`);
      }
    } catch (error) {
      logger.error("Error fetching items", error);
      throw new Error("Error fetching items");
    }
  }
}
