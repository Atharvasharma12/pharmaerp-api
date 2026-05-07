import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import corsConfig from "./config/cors.js";
import routes from "./routes/index.routes.js";

import requestLogger from "./middlewares/requestLogger.middleware.js";
import notFound from "./middlewares/notFound.middleware.js";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

// security headers
app.use(helmet());

// cors
app.use(corsConfig);

// body parser
app.use(express.json({ limit: "10mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// cookie parser
app.use(cookieParser());

// request logger
app.use(requestLogger);

// routes
app.use(routes);

// not found
app.use(notFound);

// global error handler
app.use(errorHandler);

export default app;
