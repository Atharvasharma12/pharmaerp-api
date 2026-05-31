import cors from "cors";
import env from "./env.js";

const allowedOrigins =
  env.CORS_ORIGIN === "*"
    ? "*"
    : env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

export default cors(corsOptions);
