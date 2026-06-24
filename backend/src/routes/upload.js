// src/routes/upload.js
//
// Handles file uploads (PDF, images, Word docs) to AWS S3.
//
//   POST /api/upload   — upload a file, get back a public S3 URL
//
// Flow:
//   1. Multer receives the file into memory (never touches disk)
//   2. We validate type + size
//   3. We push the buffer straight to S3
//   4. We return the public S3 URL to the frontend
//   5. Frontend stores that URL on the resource, same as an external link

import { Router } from 'express';
import multer, { memoryStorage, MulterError } from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import path from 'node:path';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ── S3 client ────────────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// ── Allowed file types ───────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  'application/pdf',                                                    // PDF
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',                // images
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword'                                                  // .doc
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.docx', '.doc'];

const MAX_SIZE_MB  = 20;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

// ── Multer — store in memory, not on disk ────────────────────────────────────

const upload = multer({
  storage: memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Upload PDF, JPG, PNG, GIF, WEBP, DOCX, or DOC files only.`));
    }
  }
});

// ── Helper: build a clean, unique S3 key ─────────────────────────────────────

function buildS3Key(originalName, userId) {
  const ext       = path.extname(originalName).toLowerCase();
  const baseName  = path.basename(originalName, ext)
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // replace spaces/special chars with _
    .slice(0, 60);                      // keep keys readable but not too long
  const timestamp = Date.now();
  const random    = Math.random().toString(36).slice(2, 8);
  // e.g. uploads/abc123/Fluid_Mechanics_Lab_Manual-1720000000000-x7k2m1.pdf
  return `uploads/${userId}/${baseName}-${timestamp}-${random}${ext}`;
}

// ── Route ────────────────────────────────────────────────────────────────────

router.post('/', requireAuth, (req, res) => {
  // Run multer first (it validates size + type), then handle S3 upload
  upload.single('file')(req, res, async (err) => {

    // Multer errors (wrong type, too large)
    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: `File too large — maximum size is ${MAX_SIZE_MB}MB.` });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file received.' });
    }

    const key = buildS3Key(req.file.originalname, req.user.id);

    try {
      await s3.send(new PutObjectCommand({
        Bucket:      process.env.S3_BUCKET_NAME,
        Key:         key,
        Body:        req.file.buffer,
        ContentType: req.file.mimetype,
        // No ACL — we rely on the bucket policy for public read access
      }));

      // Build the public URL
      const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      res.status(201).json({
        url:          fileUrl,
        key,
        originalName: req.file.originalname,
        mimeType:     req.file.mimetype,
        sizeBytes:    req.file.size
      });

    } catch (s3Err) {
      console.error('S3 upload error:', s3Err);
      res.status(500).json({ error: 'File upload to S3 failed. Check your AWS credentials and bucket name in .env.' });
    }
  });
});

export default router;
