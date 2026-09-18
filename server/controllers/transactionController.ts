import { Request, Response } from 'express';
import { StockTransaction } from '../models/StockTransaction';

export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      type,
      location,
      sku,
      search,
      referenceId,
      dateFrom,
      dateTo,
      limit = 100,
      page = 1,
    } = req.query;

    const filter: any = {};

    if (type && type !== 'ALL') {
      filter.type = type;
    }

    if (location && location !== 'ALL') {
      filter.location = location;
    }

    if (sku) {
      filter.sku = String(sku).toUpperCase().trim();
    }

    if (referenceId) {
      filter.referenceId = new RegExp(String(referenceId).trim(), 'i');
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const dFrom = new Date(String(dateFrom));
        dFrom.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = dFrom;
      }
      if (dateTo) {
        const dTo = new Date(String(dateTo));
        dTo.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = dTo;
      }
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { transactionId: searchRegex },
        { productName: searchRegex },
        { sku: searchRegex },
        { referenceId: searchRegex },
        { notes: searchRegex },
        { performedBy: searchRegex },
      ];
    }

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.max(1, Number(limit));
    const skip = (pageNum - 1) * limitNum;

    const total = await StockTransaction.countDocuments(filter);
    const transactions = await StockTransaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data: transactions,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
