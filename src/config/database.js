import mongoose from "mongoose";

import env from "./env.js";
import logger from "./logger.js";

const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);

    const connection = await mongoose.connect(env.DB_URI, {
      autoIndex: env.NODE_ENV !== "production",
    });

    logger.info(`📦 MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    logger.error(`❌ Database connection failed: ${error.message}`);

    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  logger.warn("⚠️ MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("🔄 MongoDB reconnected");
});

mongoose.connection.on("error", (error) => {
  logger.error(`❌ MongoDB error: ${error.message}`);
});

export default connectDB;
