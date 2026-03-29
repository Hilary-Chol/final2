import multer from 'multer';

const allowedMimeTypes = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, callback) => {
    if (allowedMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error('Unsupported resume format. Use PDF, DOCX, or TXT.'));
  }
});

// Exported to: server/src/routes/applicantRoutes.js and server/src/routes/candidateRoutes.js
export function handleApplicantResumeUpload(req, res, next) {
  upload.single('resume')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return next();
  });
}

// Exported to: server/src/routes/authRoutes.js
export function handleUserCvUpload(req, res, next) {
  upload.single('cv')(req, res, (error) => {
    if (error) {
      return res.status(400).json({ message: error.message });
    }

    return next();
  });
}
