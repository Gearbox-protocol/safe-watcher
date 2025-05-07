import { writeFileSync } from "fs";
import tmp from "tmp";
import { loadConfig as load } from "zod-config";
import { envAdapter } from "zod-config/env-adapter";
import { jsonAdapter } from "zod-config/json-adapter";
import { yamlAdapter } from "zod-config/yaml-adapter";

import { buildConfig } from "../aws/index.js";
import logger from "../logger.js";
import { Schema } from "./schema.js";

export async function loadConfig(): Promise<Schema> {
  const cIndex = process.argv.indexOf("--config");
  if (cIndex !== -1) {
    let path = "config.yaml";
    logger.info("Loading config from local file");
    if (cIndex > 0) {
      path = process.argv[cIndex + 1] || path;
    }
    return load({
      schema: Schema,
      adapters: [yamlAdapter({ path }), envAdapter()],
    });
  } else {
    // If no config file is provided, load from AWS
    const config = await buildConfig();
    const tempFilePath = tmp.fileSync({ postfix: ".json" }).name;
    writeFileSync(tempFilePath, JSON.stringify(config));

    return load({
      schema: Schema,
      adapters: [jsonAdapter({ path: tempFilePath })],
    });
  }
}
