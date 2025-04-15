import { writeFileSync } from "fs";
import tmp from "tmp";
import { loadConfig as load } from "zod-config";
import { envAdapter } from "zod-config/env-adapter";
import { jsonAdapter } from "zod-config/json-adapter";
import { yamlAdapter } from "zod-config/yaml-adapter";

import { getSecrets, isECS } from "../aws/index.js";
import logger from "../logger.js";
import { Schema } from "./schema.js";

export async function loadConfig(): Promise<Schema> {
  if (!isECS()) {
    let path = "config.yaml";
    logger.info("Loading config from local file");
    const cIndex = process.argv.indexOf("--config");
    if (cIndex > 0) {
      path = process.argv[cIndex + 1] || path;
    }
    return load({
      schema: Schema,
      adapters: [yamlAdapter({ path }), envAdapter()],
    });
  } else {
    const config = await getSecrets();
    const tempFilePath = tmp.fileSync({ postfix: ".json" }).name;
    writeFileSync(tempFilePath, JSON.stringify(config));

    return load({
      schema: Schema,
      adapters: [jsonAdapter({ path: tempFilePath })],
    });
  }
}
