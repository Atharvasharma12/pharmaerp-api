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
  DB_URI: process.env.DB_URI || "mongodb+srv://pahuch:pahuch@pahuch.rfqf2.mongodb.net/pahuch?retryWrites=true&w=majority&appName=Pahuch",

  // erp auth
  JWT_SECRET: process.env.JWT_SECRET || "HGASDVSBCHJASDGHJNCYERWEFJHBCNCYKVGHVKBJKJWTEF7643YRGFHBF7U2YGRHB",

  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // platform auth
  PLATFORM_JWT_SECRET: process.env.PLATFORM_JWT_SECRET || "platform-secret",

  PLATFORM_JWT_EXPIRES_IN: process.env.PLATFORM_JWT_EXPIRES_IN || "7d",

  // cors
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:5173",

  // email (Brevo API Configuration)
  BREVO_API_KEY:
    process.env.BREVO_API_KEY ||
    "YOUR_BREVO_API_KEY",
  MAIL_FROM:
    process.env.MAIL_FROM || "Pharma ERP <devanshupadhyay2611@gmail.com>",
};

export default env;
