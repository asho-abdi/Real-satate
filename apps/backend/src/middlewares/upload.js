import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const uploadRoot = path.isAbsolute(env.UPLOAD_DIR)
  ? env.UPLOAD_DIR
  : path.resolve(process.cwd(), env.UPLOAD_DIR);

const propertiesDir = path.join(uploadRoot, 'properties');
const unitsDir = path.join(uploadRoot, 'units');
const documentsDir = path.join(uploadRoot, 'documents');

for (const dir of [propertiesDir, unitsDir, documentsDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * @param {string} dest
 */
function diskStorage(dest) {
  return multer.diskStorage({
    destination(_req, _file, cb) {
      cb(null, dest);
    },
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${uuidv4()}${ext}`);
    },
  });
}

const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/**
 * @param {import('express').Request} _req
 * @param {Express.Multer.File} file
 * @param {multer.FileFilterCallback} cb
 */
function imageFilter(_req, file, cb) {
  if (!IMAGE_MIME.has(file.mimetype)) {
    return cb(new AppError('Only image files are allowed (jpeg, png, webp, gif)', 400));
  }
  return cb(null, true);
}

/**
 * @param {import('express').Request} _req
 * @param {Express.Multer.File} file
 * @param {multer.FileFilterCallback} cb
 */
function documentFilter(_req, file, cb) {
  const allowed = new Set([
    ...IMAGE_MIME,
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ]);
  if (!allowed.has(file.mimetype)) {
    return cb(new AppError('File type not allowed', 400));
  }
  return cb(null, true);
}

const limits = { fileSize: env.MAX_FILE_SIZE_BYTES };

export const uploadPropertyImages = multer({
  storage: diskStorage(propertiesDir),
  fileFilter: imageFilter,
  limits,
});

/** Alias for unit gallery uploads (stores under /uploads/units). */
export const uploadUnitImages = multer({
  storage: diskStorage(unitsDir),
  fileFilter: imageFilter,
  limits,
});

export const uploadDocument = multer({
  storage: diskStorage(documentsDir),
  fileFilter: documentFilter,
  limits,
});

export { uploadRoot, propertiesDir, unitsDir, documentsDir };
export default { uploadPropertyImages, uploadUnitImages, uploadDocument };
