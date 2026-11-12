import express from 'express';
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  allocateUserRole,
  deleteUser,
  requestAccount,
  getAccountRequests,
  approveAccountRequest,
  rejectAccountRequest,
  createDirectAccount,
  demoLogin,
  getMongoStatus,
} from '../controllers/userController.js';

import { 
  authMiddleware, 
  adminMiddleware, 
  plannerOrAdminMiddleware 
} from '../config/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/request-account', requestAccount);
router.post('/demo-login', demoLogin);
router.get('/mongo-status', getMongoStatus);

// Account Requests & Direct Provisioning (Plan Event Account Manager Only)
router.get('/account-requests', authMiddleware, plannerOrAdminMiddleware, getAccountRequests);
router.post('/account-requests/:id/approve', authMiddleware, plannerOrAdminMiddleware, approveAccountRequest);
router.post('/account-requests/:id/reject', authMiddleware, plannerOrAdminMiddleware, rejectAccountRequest);
router.post('/create-account', authMiddleware, plannerOrAdminMiddleware, createDirectAccount);

// Protected routes
router.get('/profile', authMiddleware, getUserProfile);
router.put('/profile', authMiddleware, updateUserProfile);

// Plan Event & Admin Allocation routes
router.get('/', authMiddleware, plannerOrAdminMiddleware, getUsers);
router.put('/:id/role', authMiddleware, plannerOrAdminMiddleware, allocateUserRole);

// Admin-only deletion route
router.delete('/:id', authMiddleware, adminMiddleware, deleteUser);

export default router;
