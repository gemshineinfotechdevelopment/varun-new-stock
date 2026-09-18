import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settingsController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, getSettings);
router.post('/', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), updateSettings);

export default router;
