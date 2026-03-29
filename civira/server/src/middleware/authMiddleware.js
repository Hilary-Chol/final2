import jwt from 'jsonwebtoken';

// Exported to: server/src/routes/authRoutes.js, auditRoutes.js, candidateRoutes.js, interviewRoutes.js, jobRoutes.js, scoreRoutes.js
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'applicant') {
      return res.status(403).json({ message: 'This endpoint requires organization authentication' });
    }

    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
}

// Exported to: server/src/routes/authRoutes.js, auditRoutes.js, interviewRoutes.js, scoreRoutes.js
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    return next();
  };
}
