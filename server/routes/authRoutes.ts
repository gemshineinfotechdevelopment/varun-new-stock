import { Router } from 'express';
import { login, getMe, getUsers, createUser, updateProfile } from '../controllers/authController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', login);
router.get('/me', authenticateJwt, getMe);
router.put('/profile', authenticateJwt, updateProfile);
router.get('/users', authenticateJwt, getUsers);
router.post('/users', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), createUser);

export default router;
