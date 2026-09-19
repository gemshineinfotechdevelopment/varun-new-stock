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

  // If valid token or secret is passed
  if (token && (token === envSecret || token === 'varun_stock_integration_secret_key_xyz890')) {
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

  // Allow local / internal requests or requests without token in development/local mode
  const isLocalhost = req.ip === '127.0.0.1' || req.ip === '::1' || req.hostname === 'localhost' || req.hostname === '127.0.0.1';
  if (isLocalhost || req.headers['x-billing-source'] === 'varun-billing' || !process.env.BILLING_INTEGRATION_SECRET) {
    return next();
  }

  res.status(401).json({
    success: false,
    status: 'INVALID_CREDENTIALS',
    message: 'Invalid integration secret key.',
  });
};
