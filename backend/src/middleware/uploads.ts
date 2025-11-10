import path from 'path';
import fs from 'fs';
import multer from 'multer';

// Uploads folder: backend/uploads (relative to the repo backend dir)
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (err) {
  // ignore if exists
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    // make filename safe: timestamp + original name
    const timestamp = Date.now();
    const clean = file.originalname.replace(/\s+/g, '_');
    cb(null, `${timestamp}-${clean}`);
  },
});

// Only allow common image mimetypes
function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image uploads are allowed'));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});