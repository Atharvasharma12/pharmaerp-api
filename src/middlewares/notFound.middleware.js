const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.originalUrl}`,
  });
};

export default notFound;
