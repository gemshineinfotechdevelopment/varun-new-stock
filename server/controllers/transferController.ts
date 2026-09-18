import { Request, Response } from 'express';
import { StockTransfer } from '../models/StockTransfer';
import { StockService } from '../services/stockService';
import { AuthRequest } from '../middleware/authMiddleware';

export const getTransfers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const filter: any = {};

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { transferNumber: searchRegex },
        { remarks: searchRegex },
        { 'items.productName': searchRegex },
        { 'items.sku': searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await StockTransfer.countDocuments(filter);
    const transfers = await StockTransfer.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: transfers,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTransferById = async (req: Request, res: Response): Promise<void> => {
  try {
    const transfer = await StockTransfer.findById(req.params.id);
    if (!transfer) {
      res.status(404).json({ success: false, message: 'Transfer record not found' });
      return;
    }

    res.json({ success: true, data: transfer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createTransfer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, direction = 'GODOWN_TO_SHOP', remarks } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'At least one transfer item is required' });
      return;
    }

    const transferredBy = req.user ? (req.user.name || req.user.username) : 'Admin';

    const transferDoc = await StockService.transferStock({
      items,
      direction,
      remarks,
      transferredBy,
    });

    const isShopToGodown = direction === 'SHOP_TO_GODOWN';
    res.status(201).json({
      success: true,
      message: `Successfully transferred ${transferDoc.totalQuantity} PCS ${isShopToGodown ? 'from Shop to Godown' : 'from Godown to Shop'}`,
      data: transferDoc,
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
