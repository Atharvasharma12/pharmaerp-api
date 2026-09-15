import multer from "multer";

const storage = multer.memoryStorage();

export const uploadFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

export default uploadFile;
