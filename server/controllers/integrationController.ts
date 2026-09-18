import { Request, Response } from 'express';
import { StockService } from '../services/stockService';
import { IntegrationEvent } from '../models/IntegrationEvent';
import { Settings } from '../models/Settings';

/**
 * Handle incoming Finalized Bill Sale from Varun Trade Billing
 */
export const handleBillingSale = async (req: Request, res: Response): Promise<void> => {
  try {
    const idempotencyKey = (
      req.headers['idempotency-key'] ||
      req.headers['x-idempotency-key'] ||
      req.body.idempotencyKey ||
      ''
    ).toString();

    const result = await StockService.processBillingSale(req.body, idempotencyKey);

    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('[Integration Error - handleBillingSale]:', error);

    // If billNumber was present, save failed event for auditing
    if (req.body && req.body.billNumber) {
      try {
        await IntegrationEvent.create({
          externalBillId: req.body.billId || 'UNKNOWN',
          billNumber: req.body.billNumber,
          eventType: 'BILL_SALE',
          status: 'FAILED',
          items: [],
          rawRequestPayload: req.body,
          failureReason: error.message,
          processedAt: new Date(),
        });
      } catch (logErr) {
        console.error('Failed to log failed integration event:', logErr);
      }
    }

    res.status(500).json({
      success: false,
      status: 'ERROR',
      message: error.message || 'Internal integration error while processing bill stock deduction',
    });
  }
};

/**
 * Handle Bill Reversal when a bill is cancelled in Varun Trade Billing
 */
export const handleBillingReversal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { billId, billNumber, reason } = req.body;

    const result = await StockService.processBillingReversal({
      billId,
      billNumber,
      reason,
    });

    res.json(result);
  } catch (error: any) {
    console.error('[Integration Error - handleBillingReversal]:', error);
    res.status(400).json({
      success: false,
      status: 'REVERSAL_FAILED',
      message: error.message,
    });
  }
};

/**
 * Health check & status probe for integration
 */
export const getIntegrationHealth = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await Settings.findOne();
    const totalEvents = await IntegrationEvent.countDocuments();
    const processedEvents = await IntegrationEvent.countDocuments({ status: 'PROCESSED' });
    const failedEvents = await IntegrationEvent.countDocuments({ status: 'FAILED' });
    const reversedEvents = await IntegrationEvent.countDocuments({ status: 'REVERSED' });

    const lastEvent = await IntegrationEvent.findOne().sort({ createdAt: -1 });

    res.json({
      success: true,
      status: 'HEALTHY',
      service: 'Varun Trade Stock Maintenance Integration API',
      timestamp: new Date().toISOString(),
      stats: {
        totalEvents,
        processedEvents,
        failedEvents,
        reversedEvents,
        lastEventAt: lastEvent ? lastEvent.createdAt : null,
      },
      settings: {
        billingApiUrl: settings?.billingApiUrl || 'http://localhost:5011',
        autoSyncEnabled: settings?.autoSyncEnabled ?? true,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Integration Event Logs for admin dashboard
 */
export const getIntegrationEvents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, search, limit = 50, page = 1 } = req.query;
    const filter: any = {};

    if (status && status !== 'ALL') {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { billNumber: searchRegex },
        { externalBillId: searchRegex },
        { 'items.productName': searchRegex },
        { 'items.sku': searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await IntegrationEvent.countDocuments(filter);
    const events = await IntegrationEvent.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: events,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Retry failed integration event
 */
export const retryIntegrationEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const event = await IntegrationEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({ success: false, message: 'Event not found' });
      return;
    }

    if (!event.rawRequestPayload) {
      res.status(400).json({ success: false, message: 'No payload found to retry' });
      return;
    }

    const result = await StockService.processBillingSale(
      event.rawRequestPayload,
      event.idempotencyKey
    );

    if (result.success) {
      event.status = 'PROCESSED';
      event.failureReason = undefined;
      event.processedAt = new Date();
      await event.save();
    }

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
