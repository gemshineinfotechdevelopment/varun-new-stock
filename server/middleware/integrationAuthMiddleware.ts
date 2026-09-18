import { Request, Response, NextFunction } from 'express';
import { Settings } from '../models/Settings';

export const authenticateIntegration = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] || req.headers['x-integration-key'];

  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (typeof apiKeyHeader === 'string') {
    token = apiKeyHeader;
  }

  const envSecret = process.env.BILLING_INTEGRATION_SECRET || 'varun_stock_integration_secret_key_xyz890';

  if (!token) {
    res.status(401).json({
      success: false,
      status: 'UNAUTHORIZED',
      message: 'Integration authentication required. Provide Bearer token or x-api-key header.',
    });
    return;
  }

  // Check against env variable first
  if (token === envSecret) {
    return next();
  }

  // Also check database settings
  try {
    const settings = await Settings.findOne();
    if (settings && settings.integrationApiKey && token === settings.integrationApiKey) {
      return next();
    }
  } catch (err) {
    console.error('Error verifying integration key against DB:', err);
  }

  res.status(401).json({
    success: false,
    status: 'INVALID_CREDENTIALS',
    message: 'Invalid integration secret key.',
  });
};
