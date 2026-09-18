import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditLogController';
import { authenticateJwt, requireRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateJwt, requireRoles('SUPER_ADMIN', 'ADMIN'), getAuditLogs);

export default router;
