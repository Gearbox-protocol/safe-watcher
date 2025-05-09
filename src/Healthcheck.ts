import { createServer } from "node:http";

import { formatDuration, intervalToDuration } from "date-fns";
import { customAlphabet } from "nanoid";

import logger from "./logger.js";

const nanoid = customAlphabet("1234567890abcdef", 8);

class Healthcheck {
  #id = nanoid();
  #version?: string;
  #start = new Date();

  public async run(): Promise<void> {
    this.#version = process.env.PACKAGE_VERSION || "dev";
    const server = createServer(async (req, res) => {
      // Routing
      if (req.url === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        logger.debug("healthcheck ping");
        res.end(
          JSON.stringify({
            uptime: formatDuration(
              intervalToDuration({ start: this.#start, end: new Date() }),
            ),
          }),
        );
      } else if (req.url === "/metrics") {
        try {
          res.writeHead(200, { "Content-Type": "text/plain" });
          logger.debug("healthcheck metrics");
          res.end(this.#metrics());
        } catch (ex) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          logger.error("healthcheck error", { error: ex });
          res.end("error");
        }
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        logger.error("healthcheck not found", { url: req.url });
        res.end("not found");
      }
    });

    server.listen(4000, () => {
      logger.info("started healthcheck");
    });
  }

  /**
   * Returns metrics in prometheus format
   * https://prometheus.io/docs/concepts/data_model/
   */
  #metrics(): string {
    const labels = Object.entries({
      instance_id: this.#id,
      version: this.#version,
    })
      .map(([k, v]) => `${k}="${v}"`)
      .join(", ");
    return `# HELP service_up Simple binary flag to indicate being alive
# TYPE service_up gauge
service_up{${labels}} 1

# HELP start_time Start time, in unixtime
# TYPE start_time gauge
start_time{${labels}} ${this.#start}
`;
  }
}
export default Healthcheck;
