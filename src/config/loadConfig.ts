import { loadConfig as load } from "zod-config";
import { envAdapter } from "zod-config/env-adapter";
import { yamlAdapter } from "zod-config/yaml-adapter";

import { isECS } from "../aws/index.js";
import logger from "../logger.js";
import { Schema } from "./schema.js";

export async function loadConfig(): Promise<Schema> {
  let path = "config.yaml";
  if (!isECS()) {
    logger.info("Loading config from local file");
    const cIndex = process.argv.indexOf("--config");
    if (cIndex > 0) {
      path = process.argv[cIndex + 1] || path;
    }
  }
  return load({
    schema: Schema,
    adapters: [yamlAdapter({ path }), envAdapter()],
  });
}
