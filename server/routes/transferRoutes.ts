import { Router } from 'express';
import {
  getTransfers,
  getTransferById,
  createTransfer,
} from '../controllers/transferController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, getTransfers);
router.get('/:id', authenticateJwt, getTransferById);
router.post('/', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN', 'STAFF'), createTransfer);

export default router;
