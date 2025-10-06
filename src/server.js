// -------------------- IMPORTS --------------------
const dotenv = require("dotenv");
const app = require("./app");
const { connectDB, initializeDatabase } = require("./config/db");
const logger = require("./config/logger");
const process = require("process");

// -------------------- LOAD ENVIRONMENT --------------------
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
dotenv.config({ path: envFile });

// -------------------- CHECK REQUIRED ENV VARIABLES --------------------
const requiredEnv = ["DATABASE_URL", "JWT_SECRET", "COOKIE_SECRET"];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    logger.error(`❌ Required environment variable ${key} not set in ${envFile}`);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 8000;

// -------------------- ASYNC SERVER START --------------------
(async () => {
  try {
    // Connect to the database
    await connectDB();
    logger.info("✅ Database connected successfully");

    // Initialize database (migrations / seeders)
    await initializeDatabase();
    logger.info("✅ Database initialization completed");

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Server running at: http://localhost:${PORT} (${process.env.NODE_ENV || "development"})`);
    });

    // -------------------- GRACEFUL SHUTDOWN --------------------
    const shutdown = (signal) => {
      logger.warn(`⚠️ Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info("Server closed. Cleaning up resources...");
        try {
          await require("./config/db").disconnectDB(); // Optional DB disconnect
        } catch (err) {
          logger.error("Error during DB disconnect:", err);
        }
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // -------------------- UNCAUGHT EXCEPTIONS & UNHANDLED REJECTIONS --------------------
    process.on("uncaughtException", (err) => {
      logger.error("💥 Uncaught Exception:", err);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
      process.exit(1);
    });

  } catch (error) {
    logger.error(`❌ Failed to start server: ${error.message}`, error);
    process.exit(1);
  }
})();
