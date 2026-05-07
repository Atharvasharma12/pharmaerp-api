import cors from "cors";
import env from "./env.js";

const corsOptions = {
  origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(","),
  credentials: true,
};

export default cors(corsOptions);
