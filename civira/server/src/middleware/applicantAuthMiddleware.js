import jwt from 'jsonwebtoken';

// Exported to: server/src/routes/applicantRoutes.js and server/src/routes/candidateRoutes.js
export function requireApplicantAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'applicant') {
      return res.status(403).json({ message: 'This endpoint requires applicant authentication' });
    }
    
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token expired or invalid' });
  }
}
