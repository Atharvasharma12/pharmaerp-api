import dotenv from "dotenv";

dotenv.config();

const env = {
  // app
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT) || 5000,

  APP_NAME: process.env.APP_NAME || "Pharmacy ERP Backend",

  API_PREFIX: process.env.API_PREFIX || "/api/v1",

  // database
  DB_URI: process.env.DB_URI || "",

  // erp auth
  JWT_SECRET: process.env.JWT_SECRET || "erp-secret",

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // platform auth
  PLATFORM_JWT_SECRET: process.env.PLATFORM_JWT_SECRET || "platform-secret",

  PLATFORM_JWT_EXPIRES_IN: process.env.PLATFORM_JWT_EXPIRES_IN || "7d",

  // cors
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
};

export default env;
