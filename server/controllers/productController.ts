import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { StockService } from '../services/stockService';
import { AuthRequest } from '../middleware/authMiddleware';
import { AuditLog } from '../models/AuditLog';

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, search, status } = req.query;
    const filter: any = {};

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [{ name: searchRegex }, { sku: searchRegex }, { brand: searchRegex }];
    }

    const totalInDb = await Product.countDocuments();
    if (totalInDb === 0) {
      try {
        await StockService.syncFromBillingParticulars();
      } catch {}
    }

    const products = await Product.find(filter).sort({ createdAt: -1 }).lean();

    // Fetch corresponding inventories
    const productIds = products.map((p) => p._id);
    const inventories = await Inventory.find({ productId: { $in: productIds } }).lean();
    const invMap = new Map(inventories.map((inv) => [String(inv.productId), inv]));

    const enrichedProducts = await Promise.all(
      products.map(async (prod) => {
        let inv: any = invMap.get(String(prod._id));
        if (!inv) {
          // Auto-initialize inventory if missing
          const initialQty = typeof (prod as any).stock === 'number' ? (prod as any).stock : 0;
          inv = await Inventory.create({
            productId: prod._id,
            sku: prod.sku,
            productName: prod.name,
            category: prod.category || 'General',
            godownStock: initialQty,
            shopStock: 0,
            minGodownStock: prod.minGodownStock || 10,
            minShopStock: prod.minShopStock || 5,
            lastMovementAt: new Date(),
          });
        }

        const godownStock = inv ? inv.godownStock : 0;
        const shopStock = inv ? inv.shopStock : 0;
        return {
          ...prod,
          godownStock,
          shopStock,
          totalStock: godownStock + shopStock,
        };
      })
    );

    res.json({ success: true, count: enrichedProducts.length, data: enrichedProducts });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    const inventory = await Inventory.findOne({ productId: product._id });
    res.json({ success: true, data: { product, inventory } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      name,
      sku,
      category,
      brand,
      unit = 'PCS',
      minGodownStock = 10,
      minShopStock = 5,
      description = '',
      godownOpeningStock = 0,
      shopOpeningStock = 0,
    } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ success: false, message: 'Product Name is required' });
      return;
    }

    let finalSku = (sku || '').trim().toUpperCase();
    if (!finalSku) {
      const cleanName = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
      finalSku = `${cleanName || 'ITEM'}-${Date.now().toString().slice(-4)}`;
    }

    const existing = await Product.findOne({ sku: finalSku });
    if (existing) {
      res.status(400).json({ success: false, message: `A product with SKU '${finalSku}' already exists` });
      return;
    }

    const product = await Product.create({
      name: name.trim(),
      sku: finalSku,
      category: category || 'General',
      brand: brand || '',
      unit: unit || 'PCS',
      minGodownStock: Number(minGodownStock) || 0,
      minShopStock: Number(minShopStock) || 0,
      description: description || '',
      isActive: true,
    });

    // Initialize Inventory & Opening Stock
    const { inventory } = await StockService.setOpeningStock({
      productId: product._id,
      godownQty: Math.max(0, Number(godownOpeningStock) || 0),
      shopQty: Math.max(0, Number(shopOpeningStock) || 0),
      user: req.user ? (req.user.name || req.user.username) : 'Admin',
    });

    res.status(201).json({
      success: true,
      message: 'Product created successfully with opening stock',
      data: { product, inventory },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, category, brand, unit, minGodownStock, minShopStock, description, isActive } =
      req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    if (name) product.name = name.trim();
    if (category) product.category = category.trim();
    if (brand !== undefined) product.brand = brand.trim();
    if (unit) product.unit = unit.trim();
    if (minGodownStock !== undefined) product.minGodownStock = Number(minGodownStock);
    if (minShopStock !== undefined) product.minShopStock = Number(minShopStock);
    if (description !== undefined) product.description = description.trim();
    if (isActive !== undefined) product.isActive = Boolean(isActive);

    await product.save();

    // Sync inventory metadata
    await Inventory.findOneAndUpdate(
      { productId: product._id },
      {
        productName: product.name,
        category: product.category,
        minGodownStock: product.minGodownStock,
        minShopStock: product.minShopStock,
      }
    );

    res.json({ success: true, message: 'Product updated successfully', data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteProduct = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id || '').trim();
    let product = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      product = await Product.findById(id);
    }
    if (!product) {
      product = await Product.findOne({ $or: [{ _id: id }, { sku: id.toUpperCase() }] });
    }

    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found in database' });
      return;
    }

    const productId = product._id;
    const sku = product.sku;
    const productName = product.name;

    // Hard delete from Product collection
    await Product.deleteMany({ $or: [{ _id: productId }, { sku }] });

    // Hard delete from Inventory collection
    await Inventory.deleteMany({ $or: [{ productId }, { sku }] });

    // Clean up or audit
    await AuditLog.create({
      user: req.user ? req.user.name : 'Admin',
      action: `Deleted product '${productName}' (${sku}) and all associated inventory records`,
      module: 'PRODUCT',
      referenceId: String(productId),
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      message: `Product '${productName}' completely deleted from database.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkDeleteProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ids, deleteAll } = req.body;

    if (deleteAll) {
      const count = await Product.countDocuments();
      await Product.deleteMany({});
      await Inventory.deleteMany({});

      await AuditLog.create({
        user: req.user ? req.user.name : 'Admin',
        action: `Bulk deleted all products and inventories (${count} items removed)`,
        module: 'PRODUCT',
        referenceId: `BULK-DEL-ALL-${Date.now()}`,
        ipAddress: req.ip || '',
      });

      res.json({
        success: true,
        message: `Successfully deleted all ${count} products and inventory records from database.`,
        deletedCount: count,
      });
      return;
    }

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'Please provide an array of product IDs to delete' });
      return;
    }

    const objectIds = ids
      .filter((id: string) => mongoose.Types.ObjectId.isValid(id))
      .map((id: string) => new mongoose.Types.ObjectId(id));

    const productsToDelete = await Product.find({
      $or: [{ _id: { $in: objectIds } }, { sku: { $in: ids } }],
    }).lean();

    const productIds = productsToDelete.map((p) => p._id);
    const skus = productsToDelete.map((p) => p.sku);

    const deleteResult = await Product.deleteMany({
      $or: [{ _id: { $in: productIds } }, { sku: { $in: skus } }],
    });

    await Inventory.deleteMany({
      $or: [{ productId: { $in: productIds } }, { sku: { $in: skus } }],
    });

    await AuditLog.create({
      user: req.user ? req.user.name : 'Admin',
      action: `Bulk deleted ${deleteResult.deletedCount} products and inventory records`,
      module: 'PRODUCT',
      referenceId: `BULK-DEL-${Date.now()}`,
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      message: `Successfully deleted ${deleteResult.deletedCount} selected products.`,
      deletedCount: deleteResult.deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const bulkUploadProducts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ success: false, message: 'Products array is required and cannot be empty' });
      return;
    }

    const { Category } = require('../models/Category');

    let insertedCount = 0;
    let updatedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < products.length; i++) {
      const row = products[i];
      const itemName = String(row.name || row['Item Name'] || row.productName || '').trim();

      if (!itemName) {
        errors.push(`Row ${i + 1}: Missing item name`);
        continue;
      }

      const slNo = Number(row.slNo || row['SL.NO'] || row['SL NO'] || row['S.NO'] || i + 1) || (i + 1);
      const categoryName = String(row.category || row['Category'] || 'General').trim() || 'General';
      const unit = String(row.unit || row['Unit'] || 'PCS').trim() || 'PCS';
      const mrp = Number(row.mrp || row['MRP'] || 0) || 0;
      const discount = Number(row.discount || row['Discount %'] || row['Discount'] || 0) || 0;
      let rate = Number(row.rate || row['Rate'] || 0) || 0;
      if (!rate && mrp > 0) {
        rate = Math.round((mrp - (mrp * discount) / 100) * 100) / 100;
      }
      const godownStock = Number(row.godownStock || row['Godown Stock'] || row['godown_stock'] || row.stock || row['Stock'] || 0) || 0;
      const shopStock = Number(row.shopStock || row['Shop Stock'] || row['shop_stock'] || 0) || 0;
      const totalStock = godownStock + shopStock;

      // Auto SKU generation if not supplied
      let sku = String(row.sku || row['SKU'] || '').trim().toUpperCase();
      if (!sku) {
        // e.g. "FP1001" or "SL-1"
        const cleanName = itemName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
        sku = `${cleanName || 'ITEM'}-${slNo}`;
      }

      // Auto ensure category exists
      try {
        await Category.findOneAndUpdate(
          { name: categoryName },
          { name: categoryName },
          { upsert: true, new: true }
        );
      } catch {}

      // Find by exact name or SKU
      let product = await Product.findOne({
        $or: [{ sku }, { name: itemName }],
      });

      if (product) {
        product.name = itemName;
        product.slNo = slNo;
        product.category = categoryName;
        product.unit = unit;
        product.mrp = mrp;
        product.discount = discount;
        product.rate = rate;
        product.stock = totalStock;
        product.isActive = true;
        await product.save();

        // Update inventory record
        let inv = await Inventory.findOne({ productId: product._id });
        if (!inv) {
          inv = new Inventory({
            productId: product._id,
            sku: product.sku,
            productName: product.name,
            category: product.category,
            godownStock: godownStock,
            shopStock: shopStock,
            minGodownStock: product.minGodownStock || 10,
            minShopStock: product.minShopStock || 5,
            lastMovementAt: new Date(),
          });
        } else {
          inv.productName = product.name;
          inv.category = product.category;
          inv.godownStock = godownStock;
          if (row['Shop Stock'] !== undefined || row.shopStock !== undefined) {
            inv.shopStock = shopStock;
          }
          inv.lastMovementAt = new Date();
        }
        await inv.save();
        updatedCount++;
      } else {
        // Create new product
        product = await Product.create({
          slNo,
          name: itemName,
          sku,
          category: categoryName,
          unit,
          mrp,
          discount,
          rate,
          stock: totalStock,
          minGodownStock: 10,
          minShopStock: 5,
          isActive: true,
        });

        await Inventory.create({
          productId: product._id,
          sku: product.sku,
          productName: product.name,
          category: product.category,
          godownStock: godownStock,
          shopStock: shopStock,
          minGodownStock: 10,
          minShopStock: 5,
          lastMovementAt: new Date(),
        });
        insertedCount++;
      }
    }

    await AuditLog.create({
      user: req.user ? req.user.name : 'Admin',
      action: `Bulk Upload Excel: ${insertedCount} created, ${updatedCount} updated`,
      module: 'PRODUCT',
      referenceId: `BULK-${Date.now()}`,
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      message: `Successfully processed ${insertedCount + updatedCount} products (${insertedCount} new created, ${updatedCount} updated)`,
      insertedCount,
      updatedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const syncFromBilling = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await StockService.syncFromBillingParticulars();

    await AuditLog.create({
      user: req.user ? req.user.name : 'Admin',
      action: `Sync from Billing: ${result.syncedCount} new, ${result.updatedCount} updated`,
      module: 'PRODUCT',
      referenceId: `SYNC-${Date.now()}`,
      ipAddress: req.ip || '',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
