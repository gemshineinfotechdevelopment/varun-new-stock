import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUploadProducts,
  syncFromBilling,
} from '../controllers/productController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, getProducts);
router.post('/sync-billing', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), syncFromBilling);
router.post('/bulk', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), bulkUploadProducts);
router.get('/:id', authenticateJwt, getProductById);
router.post('/', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), createProduct);
router.put('/:id', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), updateProduct);
router.delete('/:id', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), deleteProduct);

export default router;
