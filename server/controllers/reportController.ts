import { Request, Response } from 'express';
import { Inventory } from '../models/Inventory';
import { StockTransaction } from '../models/StockTransaction';
import { StockTransfer } from '../models/StockTransfer';

export const getStockSummaryReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category } = req.query;
    const filter: any = {};
    if (category && category !== 'ALL') {
      filter.category = category;
    }

    const items = await Inventory.find(filter).sort({ productName: 1 });

    const summary = items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      category: item.category,
      godownStock: item.godownStock,
      shopStock: item.shopStock,
      totalStock: item.godownStock + item.shopStock,
      minGodownStock: item.minGodownStock,
      minShopStock: item.minShopStock,
      isShopLow: item.shopStock <= item.minShopStock,
      isGodownLow: item.godownStock <= item.minGodownStock,
      status:
        item.godownStock === 0 && item.shopStock === 0
          ? 'OUT_OF_STOCK'
          : item.shopStock <= item.minShopStock || item.godownStock <= item.minGodownStock
          ? 'LOW_STOCK'
          : 'IN_STOCK',
      lastMovementAt: item.lastMovementAt,
    }));

    res.json({ success: true, count: summary.length, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStockMovementReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, type, location, sku } = req.query;
    const filter: any = {};

    if (type && type !== 'ALL') filter.type = type;
    if (location && location !== 'ALL') filter.location = location;
    if (sku) filter.sku = String(sku).toUpperCase().trim();

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const d = new Date(String(dateFrom));
        d.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = d;
      }
      if (dateTo) {
        const d = new Date(String(dateTo));
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const transactions = await StockTransaction.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: transactions.length, data: transactions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTransferReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo } = req.query;
    const filter: any = { status: 'COMPLETED' };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const d = new Date(String(dateFrom));
        d.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = d;
      }
      if (dateTo) {
        const d = new Date(String(dateTo));
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    const transfers = await StockTransfer.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: transfers.length, data: transfers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBillingStockOutReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dateFrom, dateTo, search } = req.query;
    const filter: any = { type: 'BILL_SALE' };

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const d = new Date(String(dateFrom));
        d.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = d;
      }
      if (dateTo) {
        const d = new Date(String(dateTo));
        d.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = d;
      }
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { referenceId: searchRegex },
        { productName: searchRegex },
        { sku: searchRegex },
      ];
    }

    const sales = await StockTransaction.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, count: sales.length, data: sales });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLowStockReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const lowStockItems = await Inventory.find({
      $or: [
        { $expr: { $lte: ['$shopStock', '$minShopStock'] } },
        { $expr: { $lte: ['$godownStock', '$minGodownStock'] } },
      ],
    }).sort({ shopStock: 1, godownStock: 1 });

    const enriched = lowStockItems.map((item) => ({
      _id: item._id,
      productId: item.productId,
      sku: item.sku,
      productName: item.productName,
      category: item.category,
      godownStock: item.godownStock,
      shopStock: item.shopStock,
      totalStock: item.godownStock + item.shopStock,
      minGodownStock: item.minGodownStock,
      minShopStock: item.minShopStock,
      isShopLow: item.shopStock <= item.minShopStock,
      isGodownLow: item.godownStock <= item.minGodownStock,
      deficitGodown: Math.max(0, item.minGodownStock - item.godownStock),
      deficitShop: Math.max(0, item.minShopStock - item.shopStock),
    }));

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
