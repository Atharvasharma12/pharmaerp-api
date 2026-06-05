import dotenv from "dotenv";

dotenv.config();

const env = {
  // app
  NODE_ENV: process.env.NODE_ENV || "development",

  PORT: Number(process.env.PORT) || 5000,

  APP_NAME: process.env.APP_NAME || "Pharmacy ERP Backend",

  API_PREFIX: process.env.API_PREFIX || "/api/v1",

  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

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

  // email
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",

  MAIL_FROM: process.env.MAIL_FROM || "Pharma ERP <onboarding@resend.dev>",
};

export default env;
