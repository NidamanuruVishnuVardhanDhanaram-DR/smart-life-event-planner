import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const authMiddleware = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    if (!req.user.role && req.user.id) {
      const dbUser = await User.findById(req.user.id).select('role');
      if (dbUser) {
        req.user.role = dbUser.role;
      }
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin role required.' });
  }
  next();
};

const plannerOrAdminMiddleware = (req, res, next) => {
  const role = req.user?.role;
  if (role !== 'admin' && role !== 'organizer' && role !== 'professional' && role !== 'pro') {
    return res.status(403).json({ message: 'Access denied. Plan Event or Admin role required.' });
  }
  next();
};

export { authMiddleware, adminMiddleware, plannerOrAdminMiddleware };
