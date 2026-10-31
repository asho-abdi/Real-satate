import fs from 'node:fs';
import path from 'node:path';
import { AppError } from './AppError.js';

/**
 * Validate uploaded file content via magic bytes (not just client MIME/extension).
 * Deletes the file and throws if content does not match an allowed type.
 * @param {string} filePath
 * @param {'image' | 'document'} kind
 */
export function assertSafeUploadedFile(filePath, kind = 'document') {
  if (!filePath || !fs.existsSync(filePath)) {
    throw new AppError('Uploaded file missing', 400, { code: 'UPLOAD_MISSING' });
  }

  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(16);
  try {
    fs.readSync(fd, buf, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }

  const detected = detectType(buf);
  const allowedImages = new Set(['jpeg', 'png', 'gif', 'webp']);
  const allowedDocs = new Set([...allowedImages, 'pdf', 'txt']);

  const allowed = kind === 'image' ? allowedImages : allowedDocs;
  if (!detected || !allowed.has(detected)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
    throw new AppError('File content type is not allowed', 400, { code: 'UNSAFE_FILE_TYPE' });
  }

  // Block double extensions like evil.php.jpg by checking basename ends with known ext
  const ext = path.extname(filePath).toLowerCase();
  const extOk =
    (detected === 'jpeg' && ['.jpg', '.jpeg'].includes(ext)) ||
    (detected === 'png' && ext === '.png') ||
    (detected === 'gif' && ext === '.gif') ||
    (detected === 'webp' && ext === '.webp') ||
    (detected === 'pdf' && ext === '.pdf') ||
    (detected === 'txt' && ['.txt', '.csv'].includes(ext)) ||
    // Office docs are harder to magic-check; allow by extension only for doc/docx/xls/xlsx
    (kind === 'document' && ['.doc', '.docx', '.xls', '.xlsx'].includes(ext));

  if (!extOk && !['.doc', '.docx', '.xls', '.xlsx'].includes(ext)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
    throw new AppError('File extension does not match file content', 400, {
      code: 'EXTENSION_MISMATCH',
    });
  }

  return detected;
}

export function detectType(buf) {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'pdf';
  // Plain text heuristic: mostly printable ASCII in first bytes
  const sample = buf.toString('utf8');
  if (/^[\x09\x0a\x0d\x20-\x7e]+$/.test(sample) && sample.length > 0) return 'txt';
  // ZIP-based Office (docx/xlsx) start with PK
  if (buf[0] === 0x50 && buf[1] === 0x4b) return 'zip';
  // Legacy OLE Office
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return 'ole';
  return null;
}

export default { assertSafeUploadedFile };
