import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, getCategories);
router.post('/', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), createCategory);
router.put('/:id', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), updateCategory);
router.delete('/:id', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), deleteCategory);

export default router;
