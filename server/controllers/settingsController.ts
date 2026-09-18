import { Request, Response } from 'express';
import { Settings } from '../models/Settings';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditLog } from '../models/AuditLog';

export const getSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        companyName: 'Varun Trade Stock Maintenance',
        godownName: 'Main Godown (Warehouse)',
        shopName: 'Varun Trade Shop',
        integrationApiKey: process.env.BILLING_INTEGRATION_SECRET || 'varun_stock_integration_secret_key_xyz890',
        billingApiUrl: process.env.BILLING_API_URL || 'http://localhost:5011',
        autoSyncEnabled: true,
      });
    }

    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSettings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const {
      companyName,
      godownName,
      shopName,
      integrationApiKey,
      billingApiUrl,
      autoSyncEnabled,
      lowStockEmailAlerts,
      contactEmail,
    } = req.body;

    if (companyName) settings.companyName = companyName.trim();
    if (godownName) settings.godownName = godownName.trim();
    if (shopName) settings.shopName = shopName.trim();
    if (integrationApiKey) settings.integrationApiKey = integrationApiKey.trim();
    if (billingApiUrl) settings.billingApiUrl = billingApiUrl.trim();
    if (autoSyncEnabled !== undefined) settings.autoSyncEnabled = Boolean(autoSyncEnabled);
    if (lowStockEmailAlerts !== undefined) settings.lowStockEmailAlerts = Boolean(lowStockEmailAlerts);
    if (contactEmail !== undefined) settings.contactEmail = contactEmail.trim();

    await settings.save();

    await AuditLog.create({
      user: req.user ? (req.user.name || req.user.username) : 'Admin',
      action: 'Updated System Settings',
      module: 'SETTINGS',
      newValue: `Updated companyName: ${settings.companyName}`,
    });

    res.json({ success: true, message: 'Settings saved successfully', data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
