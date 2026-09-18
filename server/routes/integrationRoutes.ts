import { Router } from 'express';
import {
  handleBillingSale,
  handleBillingReversal,
  getIntegrationHealth,
  getIntegrationEvents,
  retryIntegrationEvent,
} from '../controllers/integrationController';
import { authenticateIntegration } from '../middleware/integrationAuthMiddleware';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

// Secure backend-to-backend webhooks from Varun Trade Billing
router.post('/billing/sale', authenticateIntegration, handleBillingSale);
router.post('/billing/reversal', authenticateIntegration, handleBillingReversal);
router.get('/billing/health', getIntegrationHealth);

// Admin integration dashboard routes
router.get('/billing/events', authenticateJwt, getIntegrationEvents);
router.post('/billing/retry/:id', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), retryIntegrationEvent);

export default router;
