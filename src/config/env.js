import dotenv from "dotenv";

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,

  APP_NAME: process.env.APP_NAME || "ERP Backend",

  DB_URI: process.env.DB_URI || "",

  JWT_SECRET: process.env.JWT_SECRET || "secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};

export default env;
