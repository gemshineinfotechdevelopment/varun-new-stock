import { Request, Response } from 'express';
import { StockAdjustment } from '../models/StockAdjustment';
import { StockService } from '../services/stockService';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAdjustments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { location, search, limit = 50, page = 1 } = req.query;
    const filter: any = {};

    if (location && (location === 'GODOWN' || location === 'SHOP')) {
      filter.location = location;
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { adjustmentNumber: searchRegex },
        { productName: searchRegex },
        { sku: searchRegex },
        { reason: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await StockAdjustment.countDocuments(filter);
    const adjustments = await StockAdjustment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: adjustments,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, location, physicalQty, reason } = req.body;

    if (!productId || !location || physicalQty === undefined || !reason) {
      res.status(400).json({
        success: false,
        message: 'Product ID, Location (GODOWN or SHOP), Physical Quantity and Reason are required',
      });
      return;
    }

    const result = await StockService.adjustStock({
      productId,
      location,
      physicalQty: Number(physicalQty),
      reason,
      adjustedBy: req.user ? (req.user.name || req.user.username) : 'Admin',
    });

    res.status(201).json({
      success: true,
      message: 'Physical stock adjusted and transaction ledger updated',
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
