import logger from "../config/logger.js";

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;

    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;

    logger.info(logMessage);
  });

  next();
};

export default requestLogger;
