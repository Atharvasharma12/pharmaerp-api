import multer from "multer";
import fs from "fs";
import path from "path";

const storage = multer.memoryStorage();

export const uploadFile = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
});

const legacyImportDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.resolve("uploads/legacy-imports");
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `legacy-b2c-${unique}${ext}`);
  },
});

export const uploadLegacyImportFile = multer({
  storage: legacyImportDiskStorage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250 MB
});

export default uploadFile;
