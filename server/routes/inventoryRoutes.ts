import { Router } from 'express';
import {
  getDashboardStats,
  getInventoryList,
  getProductStockDetail,
  updateOpeningStock,
} from '../controllers/inventoryController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', authenticateJwt, getDashboardStats);
router.get('/', authenticateJwt, getInventoryList);
router.get('/product/:id', authenticateJwt, getProductStockDetail);
router.post('/opening-stock', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), updateOpeningStock);

export default router;
