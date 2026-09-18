import { Router } from 'express';
import { getAdjustments, createAdjustment } from '../controllers/adjustmentController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, getAdjustments);
router.post('/', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), createAdjustment);

export default router;
