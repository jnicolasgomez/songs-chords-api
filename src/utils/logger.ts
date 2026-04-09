/**
 * Structured JSON logger for BandMate API.
 *
 * In production (Google Cloud App Engine), each JSON line is automatically
 * parsed and indexed by Cloud Logging using the `severity` and `message` fields.
 * In development, logs are pretty-printed for readability.
 */

const isProd = process.env.NODE_ENV === "production";

type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

interface LogEntry {
  severity: LogLevel;
  message: string;
  [key: string]: unknown;
}

function log(severity: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry: LogEntry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  if (isProd) {
    // Single-line JSON — Cloud Logging parses this automatically
    process.stdout.write(JSON.stringify(entry) + "\n");
  } else {
    // Human-readable in dev
    const color: Record<LogLevel, string> = {
      DEBUG:    "\x1b[37m",
      INFO:     "\x1b[36m",
      WARNING:  "\x1b[33m",
      ERROR:    "\x1b[31m",
      CRITICAL: "\x1b[35m",
    };
    const reset = "\x1b[0m";
    const prefix = `${color[severity]}[${severity}]${reset}`;
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    console.log(`${prefix} ${entry.timestamp} ${message}${metaStr}`);
  }
}

const logger = {
  debug:    (msg: string, meta?: Record<string, unknown>) => log("DEBUG",    msg, meta),
  info:     (msg: string, meta?: Record<string, unknown>) => log("INFO",     msg, meta),
  warn:     (msg: string, meta?: Record<string, unknown>) => log("WARNING",  msg, meta),
  error:    (msg: string, meta?: Record<string, unknown>) => log("ERROR",    msg, meta),
  critical: (msg: string, meta?: Record<string, unknown>) => log("CRITICAL", msg, meta),
};

/**
 * Morgan-compatible stream for HTTP request logs.
 * Pipes morgan output into the structured logger.
 */
export const morganStream = {
  write: (message: string) => {
    logger.info(message.trim(), { type: "http_request" });
  },
};

export default logger;
