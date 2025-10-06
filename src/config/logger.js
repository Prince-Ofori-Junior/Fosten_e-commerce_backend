// src/config/logger.js
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");
const fs = require("fs");
const path = require("path");

const LOG_DIR = "logs";

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// -------------------- Formatters --------------------
const logFormat = format.combine(
  format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  format.errors({ stack: true }), // include stack trace
  format.splat(),
  format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) logMessage += ` | Stack: ${stack}`;
    if (Object.keys(meta).length) logMessage += ` | Meta: ${JSON.stringify(meta)}`;
    return logMessage;
  })
);

// -------------------- Sensitive masking --------------------
const maskSensitive = format((info) => {
  const maskEmail = (str) =>
    str.replace(
      /([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      "$1***$2"
    );

  const maskString = (str) =>
    str
      .replace(/("password":")([^"]+)"/gi, '$1***"')
      .replace(/("email":")([^"]+)"/gi, '$1***"')
      .replace(/("token":")([^"]+)"/gi, '$1***"')
      .replace(/(Authorization:\s*Bearer\s+)[A-Za-z0-9\-_\.=]+/gi, "$1***")
      .replace(
        /\b([A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,}\.[A-Za-z0-9\-_]{10,})\b/g,
        "***"
      )
      .replace(/([a-zA-Z0-9._%+-]{2})[a-zA-Z0-9._%+-]*(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, "$1***$2");

  if (process.env.NODE_ENV === "production") {
    // Mask message string
    if (info.message) {
      info.message = maskString(info.message);
    }

    // Mask meta fields recursively
    if (info) {
      const maskMeta = (obj) => {
        if (typeof obj === "string") return maskString(obj);
        if (Array.isArray(obj)) return obj.map(maskMeta);
        if (obj && typeof obj === "object") {
          const masked = {};
          for (const key of Object.keys(obj)) {
            masked[key] = maskMeta(obj[key]);
          }
          return masked;
        }
        return obj;
      };
      Object.assign(info, maskMeta(info));
    }
  }

  return info;
});


// -------------------- Logger --------------------
const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(maskSensitive(), logFormat),
  defaultMeta: { service: "Mr.Ofori_backend" },
  transports: [
    new transports.Console({
      level: process.env.LOG_LEVEL || "debug",
      format: format.combine(format.colorize(), maskSensitive(), logFormat),
    }),
    new transports.DailyRotateFile({
      filename: path.join(LOG_DIR, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "30d",
      zippedArchive: true,
      handleExceptions: true,
      handleRejections: true,
    }),
    new transports.DailyRotateFile({
      filename: path.join(LOG_DIR, "combined-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      level: "info",
      maxSize: "50m",
      maxFiles: "30d",
      zippedArchive: true,
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

// Optional: stream interface for morgan HTTP logging
logger.stream = {
  write: (message) => {
    try {
      logger.info(message.trim());
    } catch (err) {
      console.error("Logger stream write failed:", err);
    }
  },
};

// Global unhandled exception/rejection handling
process.on("uncaughtException", (err) => {
  logger.error("💥 Uncaught Exception:", { message: err.message, stack: err.stack });
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("💥 Unhandled Rejection:", { promise, reason });
});

module.exports = logger;
