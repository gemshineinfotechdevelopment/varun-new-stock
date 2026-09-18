import { Router } from 'express';
import { getTransactions } from '../controllers/transactionController';
import { authenticateJwt } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, getTransactions);

export default router;
