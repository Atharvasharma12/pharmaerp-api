const healthService = () => {
  return {
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  };
};

export default healthService;
