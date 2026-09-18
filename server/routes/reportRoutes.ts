import { Router } from 'express';
import {
  getStockSummaryReport,
  getStockMovementReport,
  getTransferReport,
  getBillingStockOutReport,
  getLowStockReport,
} from '../controllers/reportController';
import { authenticateJwt } from '../middleware/authMiddleware';

const router = Router();

router.get('/summary', authenticateJwt, getStockSummaryReport);
router.get('/movements', authenticateJwt, getStockMovementReport);
router.get('/transfers', authenticateJwt, getTransferReport);
router.get('/sales', authenticateJwt, getBillingStockOutReport);
router.get('/low-stock', authenticateJwt, getLowStockReport);

export default router;
