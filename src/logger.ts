import { pino } from "pino";

const logger = pino({
  level:
    process.env.NODE_ENV === "test"
      ? "silent"
      : (process.env.LOG_LEVEL ?? "debug"),
  base: {},
  formatters: {
    level: label => {
      return {
        level: label,
      };
    },
  },
  // fluent-bit (which is used in our ecs setup with loki) cannot handle unix epoch in millis out of the box
  timestamp: () => `,"time":${Date.now() / 1000.0}`,
});

export default logger;
