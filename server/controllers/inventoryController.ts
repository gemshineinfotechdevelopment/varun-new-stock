import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Inventory } from '../models/Inventory';
import { Product } from '../models/Product';
import { StockTransaction } from '../models/StockTransaction';
import { StockTransfer } from '../models/StockTransfer';
import { StockService } from '../services/stockService';
import { AuthRequest } from '../middleware/authMiddleware';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
  try {
    try {
      await StockService.syncNewBillsFromDb();
    } catch {}

    const totalProducts = await Product.countDocuments({ isActive: true });

    // Aggregate inventory quantities
    const stockTotals = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalGodownStock: { $sum: '$godownStock' },
          totalShopStock: { $sum: '$shopStock' },
          totalStock: { $sum: { $add: ['$godownStock', '$shopStock'] } },
        },
      },
    ]);

    const totals = stockTotals[0] || { totalGodownStock: 0, totalShopStock: 0, totalStock: 0 };

    // Find low stock items
    const lowShopStockCount = await Inventory.countDocuments({
      $expr: { $lte: ['$shopStock', '$minShopStock'] },
    });

    const lowGodownStockCount = await Inventory.countDocuments({
      $expr: { $lte: ['$godownStock', '$minGodownStock'] },
    });

    // Today's start and end timestamps
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Today's Sales Stock Deduction (BILL_SALE)
    const todaySalesAgg = await StockTransaction.aggregate([
      {
        $match: {
          type: 'BILL_SALE',
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: { $abs: '$quantity' } },
          totalTransactions: { $sum: 1 },
        },
      },
    ]);
    const todaySales = todaySalesAgg[0] || { totalQuantity: 0, totalTransactions: 0 };

    // Today's Transfers (GODOWN_TO_SHOP)
    const todayTransfersAgg = await StockTransfer.aggregate([
      {
        $match: {
          status: 'COMPLETED',
          createdAt: { $gte: startOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: '$totalQuantity' },
          totalTransfers: { $sum: 1 },
        },
      },
    ]);
    const todayTransfers = todayTransfersAgg[0] || { totalQuantity: 0, totalTransfers: 0 };

    // Recent 5 transactions
    const recentTransactions = await StockTransaction.find()
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        totalProducts,
        totalGodownStock: totals.totalGodownStock,
        totalShopStock: totals.totalShopStock,
        totalStock: totals.totalStock,
        lowShopStockCount,
        lowGodownStockCount,
        lowStockTotalCount: lowShopStockCount + lowGodownStockCount,
        todaySalesQuantity: todaySales.totalQuantity,
        todaySalesCount: todaySales.totalTransactions,
        todayTransfersQuantity: todayTransfers.totalQuantity,
        todayTransfersCount: todayTransfers.totalTransfers,
        recentTransactions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getInventoryList = async (req: Request, res: Response): Promise<void> => {
  try {
    try {
      await StockService.syncNewBillsFromDb();
    } catch {}

    const { category, search, filterLowStock, sortBy = 'totalStock', sortOrder = 'desc' } = req.query;

    const query: any = {};

    if (category && category !== 'ALL') {
      query.category = category;
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      query.$or = [{ productName: searchRegex }, { sku: searchRegex }, { category: searchRegex }];
    }

    if (filterLowStock === 'shop') {
      query.$expr = { $lte: ['$shopStock', '$minShopStock'] };
    } else if (filterLowStock === 'godown') {
      query.$expr = { $lte: ['$godownStock', '$minGodownStock'] };
    } else if (filterLowStock === 'any' || filterLowStock === 'true') {
      query.$or = [
        { $expr: { $lte: ['$shopStock', '$minShopStock'] } },
        { $expr: { $lte: ['$godownStock', '$minGodownStock'] } },
      ];
    }

    const items = await Inventory.find(query);

    // Map and enrich with calculated total & status
    const enriched = items.map((item) => {
      const totalStock = item.godownStock + item.shopStock;
      const isShopLow = item.shopStock <= item.minShopStock;
      const isGodownLow = item.godownStock <= item.minGodownStock;

      let status = 'IN_STOCK';
      if (item.godownStock === 0 && item.shopStock === 0) {
        status = 'OUT_OF_STOCK';
      } else if (isShopLow || isGodownLow) {
        status = 'LOW_STOCK';
      }

      return {
        _id: item._id,
        productId: item.productId,
        sku: item.sku,
        productName: item.productName,
        category: item.category,
        godownStock: item.godownStock,
        shopStock: item.shopStock,
        minGodownStock: item.minGodownStock,
        minShopStock: item.minShopStock,
        totalStock,
        isShopLow,
        isGodownLow,
        status,
        lastMovementAt: item.lastMovementAt,
        updatedAt: item.updatedAt,
      };
    });

    // Client/query sorting
    enriched.sort((a, b) => {
      const orderMultiplier = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'godownStock') return (a.godownStock - b.godownStock) * orderMultiplier;
      if (sortBy === 'shopStock') return (a.shopStock - b.shopStock) * orderMultiplier;
      if (sortBy === 'sku') return a.sku.localeCompare(b.sku) * orderMultiplier;
      if (sortBy === 'productName') return a.productName.localeCompare(b.productName) * orderMultiplier;
      return (a.totalStock - b.totalStock) * orderMultiplier;
    });

    res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductStockDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    let product = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ sku: (id || '').toUpperCase() });
    }

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const inventory = await Inventory.findOne({ productId: product._id });
    const transactions = await StockTransaction.find({ productId: product._id })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      data: {
        product,
        inventory: inventory || {
          godownStock: 0,
          shopStock: 0,
          totalStock: 0,
          minGodownStock: product.minGodownStock,
          minShopStock: product.minShopStock,
        },
        transactions,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOpeningStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, godownQty, shopQty } = req.body;

    if (!productId) {
      res.status(400).json({ success: false, message: 'Product ID is required' });
      return;
    }

    const result = await StockService.setOpeningStock({
      productId,
      godownQty: Math.max(0, Number(godownQty) || 0),
      shopQty: Math.max(0, Number(shopQty) || 0),
      user: req.user ? (req.user.name || req.user.username) : 'Admin',
    });

    res.json({
      success: true,
      message: 'Opening stock updated successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
