import mongoose from 'mongoose';
import { Inventory, IInventory } from '../models/Inventory';
import { Product, IProduct } from '../models/Product';
import { StockTransaction, IStockTransaction } from '../models/StockTransaction';
import { StockTransfer, IStockTransfer } from '../models/StockTransfer';
import { StockAdjustment, IStockAdjustment } from '../models/StockAdjustment';
import { IntegrationEvent, IIntegrationEvent } from '../models/IntegrationEvent';
import { AuditLog } from '../models/AuditLog';

// Helper to generate sequential formatted IDs
export const generateId = (prefix: string): string => {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${rand}`;
};

export class StockService {
  /**
   * Auto-sync / Import particulars from Billing database collection (`particulars` or `items`)
   */
  /**
   * Auto-sync / Import products from Billing database collection (`pricelists`, `items`, or `particulars`)
   */
  static async syncFromBillingParticulars(): Promise<{
    syncedCount: number;
    updatedCount: number;
    totalParticulars: number;
    message: string;
  }> {
    try {
      if (!mongoose.connection.db) {
        return { syncedCount: 0, updatedCount: 0, totalParticulars: 0, message: 'DB not connected' };
      }

      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map((c) => c.name.toLowerCase());

      const { Category } = require('../models/Category');
      let syncedCount = 0;
      let updatedCount = 0;
      let rawItemsList: any[] = [];

      // 1. Check `pricelists` or `items` or `products_billing`
      for (const colName of ['pricelists', 'pricelist', 'items', 'products_billing']) {
        if (collectionNames.includes(colName)) {
          const col = mongoose.connection.db.collection(colName);
          const docs = await col.find({}).toArray();
          if (docs && docs.length > 0) {
            for (const doc of docs) {
              if (Array.isArray(doc.items)) {
                rawItemsList.push(...doc.items);
              } else if (Array.isArray(doc.products)) {
                rawItemsList.push(...doc.products);
              } else if (Array.isArray(doc.particulars)) {
                rawItemsList.push(...doc.particulars);
              } else if (doc.name || doc.particular || doc.itemName) {
                rawItemsList.push(doc);
              }
            }
          }
        }
      }

      // 2. Also check if particulars collection has catalog items (documents WITHOUT billNo or customerPhone)
      if (collectionNames.includes('particulars')) {
        const pCol = mongoose.connection.db.collection('particulars');
        const pDocs = await pCol.find({ billNo: { $exists: false }, customerName: { $exists: false } }).toArray();
        if (pDocs && pDocs.length > 0) {
          rawItemsList.push(...pDocs);
        }
      }

      if (rawItemsList.length === 0) {
        return { syncedCount: 0, updatedCount: 0, totalParticulars: 0, message: 'No catalog items found in database' };
      }

      for (let i = 0; i < rawItemsList.length; i++) {
        const item = rawItemsList[i];
        const name = String(item.name || item.particular || item.itemName || item.particularName || '').trim();
        if (!name) continue;

        const slNo = Number(item.slNo || item.sno || item.sNo || i + 1) || (i + 1);
        const categoryName = String(item.category || 'General').trim() || 'General';
        const brand = String(item.brand || '').trim();
        const unit = String(item.pktUnit || item.unit || 'PCS').trim() || 'PCS';
        const mrp = Number(item.mrp || 0) || 0;
        const discount = Number(item.discount || 0) || 0;
        let rate = Number(item.rate || 0) || 0;
        if (!rate && mrp > 0) {
          rate = Math.round((mrp - (mrp * discount) / 100) * 100) / 100;
        }
        const rawStock = Number(item.stock || item.openingStock || item.qty || item.quantity || 0) || 0;

        let sku = String(item.sku || item.itemCode || item.code || '').trim().toUpperCase();
        if (!sku) {
          const cleanName = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
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

        // Find existing product by _id, sku, or name
        let product: any = null;
        if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
          product = await Product.findById(item._id);
        }
        if (!product) {
          product = await Product.findOne({ $or: [{ sku }, { name }] });
        }

        if (product) {
          product.name = name;
          product.slNo = slNo;
          product.category = categoryName;
          product.brand = brand || product.brand;
          product.unit = unit;
          product.mrp = mrp;
          product.discount = discount;
          product.rate = rate;
          product.isActive = item.isActive !== false;

          let inv = await Inventory.findOne({ productId: product._id });
          if (!inv) {
            inv = await Inventory.create({
              productId: product._id,
              sku: product.sku,
              productName: product.name,
              category: product.category,
              godownStock: 0,
              shopStock: rawStock,
              minGodownStock: product.minGodownStock || 10,
              minShopStock: product.minShopStock || 5,
              lastMovementAt: new Date(),
            });
            product.stock = rawStock;
          } else {
            inv.productName = product.name;
            inv.category = product.category;
            inv.lastMovementAt = new Date();
            await inv.save();
            // Preserve live godown and shop stock balances!
            product.stock = (Number(inv.godownStock) || 0) + (Number(inv.shopStock) || 0);
          }
          await product.save();
          updatedCount++;
        } else {
          const productData: any = {
            slNo,
            name,
            sku,
            category: categoryName,
            brand,
            unit,
            mrp,
            discount,
            rate,
            stock: rawStock,
            minGodownStock: 10,
            minShopStock: 5,
            isActive: item.isActive !== false,
          };

          if (item._id && mongoose.Types.ObjectId.isValid(item._id)) {
            productData._id = item._id;
          }

          product = await Product.create(productData);

          await Inventory.create({
            productId: product._id,
            sku: product.sku,
            productName: product.name,
            category: product.category,
            godownStock: 0,
            shopStock: rawStock,
            minGodownStock: 10,
            minShopStock: 5,
            lastMovementAt: new Date(),
          });
          syncedCount++;
        }
      }

      console.log(`[Stock Sync] ✅ Synchronized ${syncedCount + updatedCount} products (${syncedCount} new, ${updatedCount} updated).`);
      return {
        syncedCount,
        updatedCount,
        totalParticulars: rawItemsList.length,
        message: `Successfully synced ${syncedCount + updatedCount} items from Billing`,
      };
    } catch (err: any) {
      console.error('[Stock Sync Error]:', err);
      throw err;
    }
  }

  /**
   * Automatically detect and process any bills in MongoDB `particulars`, `bills`, `invoices`, `sales`
   * that haven't been processed yet and immediately deduct from Shop Stock.
   */
  static async syncNewBillsFromDb(): Promise<{
    processedBills: number;
    skippedBills: number;
    errors: string[];
  }> {
    try {
      if (!mongoose.connection.db) {
        return { processedBills: 0, skippedBills: 0, errors: ['DB not connected'] };
      }

      const collections = await mongoose.connection.db.listCollections().toArray();
      const colNames = collections.map((c) => c.name);

      // Target collections for bills: 'particulars' (Billing bill collection), 'bills', 'invoices', 'sales', 'orders', etc.
      const targetCols = colNames.filter((n) =>
        [
          'particulars',
          'bills',
          'bill',
          'invoices',
          'invoice',
          'sales',
          'sale',
          'orders',
          'order',
          'customertransactions',
          'estimates',
          'billings',
        ].includes(n.toLowerCase())
      );

      if (targetCols.length === 0) {
        return { processedBills: 0, skippedBills: 0, errors: [] };
      }

      let processedBills = 0;
      let skippedBills = 0;
      const errors: string[] = [];

      for (const colName of targetCols) {
        const billsCol = mongoose.connection.db.collection(colName);
        const docs = await billsCol.find({}).sort({ createdAt: -1, billDate: -1, date: -1, _id: -1 }).toArray();

        // Group documents that might be flat bill items or bills with items array
        const billsMap = new Map<string, {
          billId: string;
          billNumber: string;
          customerId: string;
          billDate: any;
          items: Array<{
            productId?: string;
            sku?: string;
            productName?: string;
            quantity: number;
            slNo?: number;
          }>;
        }>();

        for (const doc of docs) {
          const billId = String(doc._id || doc.id || '').trim();
          const rawBillNo = doc.billNo ?? doc.billNumber ?? doc.invoiceNo ?? doc.invNo ?? doc.bill_no ?? doc.invoice_no ?? (doc.slNo && (doc.customerName || doc.customer) ? `BILL-${doc.slNo}` : '');
          const billNumber = String(rawBillNo || billId).trim();

          if (!billNumber) continue;

          // Check if document has array of items
          const rawItems = doc.products || doc.items || doc.particulars || doc.lines || doc.rows || doc.cart || doc.particularList || doc.itemList;

          if (Array.isArray(rawItems) && rawItems.length > 0) {
            if (!billsMap.has(billNumber)) {
              billsMap.set(billNumber, {
                billId,
                billNumber,
                customerId: String(doc.customerName || doc.customerId?.name || doc.customerId || doc.customer || doc.buyerName || 'Counter Sale').trim(),
                billDate: doc.billDate || doc.date || doc.createdAt || new Date(),
                items: [],
              });
            }

            const billEntry = billsMap.get(billNumber)!;
            for (const it of rawItems) {
              const pName = String(
                it.particular ||
                it.particularName ||
                it.productName ||
                it.name ||
                it.itemName ||
                it.item_name ||
                it.desc ||
                it.description ||
                it.particular?.name ||
                (typeof it.particular === 'string' ? it.particular : '') ||
                ''
              ).trim();
              const pQty = Number(it.quantity ?? it.qty ?? it.count ?? it.pcs ?? it.box ?? it.units ?? it.noOfUnits ?? it.billedQty ?? it.netQty ?? 0) || 0;
              const pId = it.productId || it.particularId || it.particular?._id || it._id || it.id;
              const pSku = it.sku || it.itemCode || it.code || it.particularCode;
              const pSlNo = Number(it.slNo || it.sno || it.sNo || 0) || undefined;

              if (pQty > 0 && (pName || pSku || pId)) {
                billEntry.items.push({
                  productId: pId ? String(pId) : undefined,
                  sku: pSku ? String(pSku) : undefined,
                  productName: pName,
                  quantity: pQty,
                  slNo: pSlNo,
                });
              }
            }
          } else if (rawBillNo && (doc.particular || doc.particularName || doc.itemName || doc.productName || doc.name)) {
            // Flat document row (e.g. particulars collection where each document represents one billed line)
            const pName = String(doc.particular || doc.particularName || doc.itemName || doc.productName || doc.name || '').trim();
            const pQty = Number(doc.quantity ?? doc.qty ?? doc.count ?? doc.pcs ?? doc.box ?? doc.units ?? doc.noOfUnits ?? doc.billedQty ?? 0) || 0;
            const pId = doc.productId || doc.particularId || doc.id;
            const pSku = doc.sku || doc.itemCode || doc.code;
            const pSlNo = Number(doc.slNo || doc.sno || doc.sNo || 0) || undefined;

            if (pQty > 0 && pName) {
              if (!billsMap.has(billNumber)) {
                billsMap.set(billNumber, {
                  billId,
                  billNumber,
                  customerId: String(doc.customerName || doc.customer || doc.buyerName || 'Counter Sale').trim(),
                  billDate: doc.billDate || doc.date || doc.createdAt || new Date(),
                  items: [],
                });
              }
              billsMap.get(billNumber)!.items.push({
                productId: pId ? String(pId) : undefined,
                sku: pSku ? String(pSku) : undefined,
                productName: pName,
                quantity: pQty,
                slNo: pSlNo,
              });
            }
          }
        }

        // Process all detected bills
        for (const [, bill] of billsMap) {
          if (bill.items.length === 0) continue;

          // Check if already processed
          const existing = await IntegrationEvent.findOne({
            $or: [
              { externalBillId: bill.billId },
              { billNumber: bill.billNumber },
              { billNumber: new RegExp(`^${bill.billNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            ],
            eventType: 'BILL_SALE',
            status: 'PROCESSED',
          });

          if (existing) {
            skippedBills++;
            continue;
          }

          try {
            const res = await this.processBillingSale({
              billId: bill.billId,
              billNumber: bill.billNumber,
              customerId: bill.customerId,
              items: bill.items,
              billDate: bill.billDate,
            });

            if (res.success) {
              processedBills++;
            }
          } catch (err: any) {
            console.warn(`[Auto Bill Sync] Error processing bill ${bill.billNumber} from '${colName}':`, err.message);
            errors.push(`Bill ${bill.billNumber} (${colName}): ${err.message}`);
          }
        }
      }

      if (processedBills > 0) {
        console.log(`[Auto Bill Sync] ✅ Successfully processed stock reduction for ${processedBills} new bills!`);
      }

      return { processedBills, skippedBills, errors };
    } catch (err: any) {
      console.error('[Auto Bill Sync Error]:', err);
      return { processedBills: 0, skippedBills: 0, errors: [err.message] };
    }
  }

  /**
   * Set or initialize opening stock for a product
   */
  static async setOpeningStock(params: {
    productId: string | mongoose.Types.ObjectId;
    godownQty: number;
    shopQty: number;
    user?: string;
  }): Promise<{ inventory: IInventory; transactions: IStockTransaction[] }> {
    const { productId, godownQty, shopQty, user = 'Admin' } = params;

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product not found with ID ${productId}`);
    }

    let inventory = await Inventory.findOne({ productId });
    const beforeGodown = inventory ? inventory.godownStock : 0;
    const beforeShop = inventory ? inventory.shopStock : 0;

    if (!inventory) {
      inventory = new Inventory({
        productId: product._id,
        sku: product.sku,
        productName: product.name,
        category: product.category,
        godownStock: Math.max(0, godownQty),
        shopStock: Math.max(0, shopQty),
        minGodownStock: product.minGodownStock,
        minShopStock: product.minShopStock,
        lastMovementAt: new Date(),
      });
    } else {
      inventory.godownStock = Math.max(0, godownQty);
      inventory.shopStock = Math.max(0, shopQty);
      inventory.lastMovementAt = new Date();
    }

    await inventory.save();

    const transactions: IStockTransaction[] = [];

    // Create transaction if any quantity is set
    if (godownQty > 0 || shopQty > 0 || beforeGodown !== godownQty || beforeShop !== shopQty) {
      const tx = new StockTransaction({
        transactionId: generateId('ST-OPN'),
        productId: product._id,
        sku: product.sku,
        productName: product.name,
        type: 'OPENING_STOCK',
        location: 'BOTH',
        quantity: godownQty + shopQty,
        unit: product.unit || 'PCS',
        beforeGodownStock: beforeGodown,
        afterGodownStock: inventory.godownStock,
        beforeShopStock: beforeShop,
        afterShopStock: inventory.shopStock,
        referenceId: 'OPENING_BALANCE',
        referenceType: 'OPENING',
        notes: `Opening stock configured: Godown=${godownQty} PCS, Shop=${shopQty} PCS`,
        performedBy: user,
      });
      await tx.save();
      transactions.push(tx);
    }

    await AuditLog.create({
      user,
      action: `Set Opening Stock: Godown=${godownQty} PCS, Shop=${shopQty} PCS`,
      module: 'INVENTORY',
      referenceId: product.sku,
      oldValue: `Godown: ${beforeGodown}, Shop: ${beforeShop}`,
      newValue: `Godown: ${inventory.godownStock}, Shop: ${inventory.shopStock}`,
    });

    return { inventory, transactions };
  }

  /**
   * 2-Way Stock Transfer (Godown -> Shop AND Shop -> Godown)
   */
  static async transferStock(params: {
    items: Array<{ productId: string; transferQuantity: number }>;
    direction?: 'GODOWN_TO_SHOP' | 'SHOP_TO_GODOWN';
    remarks?: string;
    transferredBy?: string;
  }): Promise<IStockTransfer> {
    const { items, direction = 'GODOWN_TO_SHOP', remarks = '', transferredBy = 'Admin' } = params;
    const isShopToGodown = direction === 'SHOP_TO_GODOWN';
    const fromLoc = isShopToGodown ? 'SHOP' : 'GODOWN';
    const toLoc = isShopToGodown ? 'GODOWN' : 'SHOP';

    if (!items || items.length === 0) {
      throw new Error('Transfer must include at least one item');
    }

    // Step 1: Pre-validate all items
    const validatedItems: Array<{
      product: IProduct;
      inventory: IInventory;
      transferQty: number;
    }> = [];

    for (const item of items) {
      if (!item.transferQuantity || item.transferQuantity <= 0) {
        throw new Error(`Transfer quantity must be greater than 0`);
      }

      const product = await Product.findById(item.productId);
      if (!product) {
        throw new Error(`Product not found with ID ${item.productId}`);
      }

      const inventory = await Inventory.findOne({ productId: item.productId });
      if (!inventory) {
        throw new Error(`Inventory not found for product ${product.name} (${product.sku})`);
      }

      const availableSource = isShopToGodown ? inventory.shopStock : inventory.godownStock;
      if (availableSource < item.transferQuantity) {
        throw new Error(
          `Insufficient ${isShopToGodown ? 'Shop' : 'Godown'} stock for '${product.name}' (${product.sku}). Available: ${availableSource} PCS, Requested: ${item.transferQuantity} PCS.`
        );
      }

      validatedItems.push({
        product,
        inventory,
        transferQty: item.transferQuantity,
      });
    }

    const transferNumber = generateId('TR');
    let totalQty = 0;
    const transferItemsData = [];

    // Step 2: Perform atomic transfers and record transactions
    for (const { product, inventory, transferQty } of validatedItems) {
      const beforeGodown = inventory.godownStock;
      const beforeShop = inventory.shopStock;

      const query = isShopToGodown
        ? { _id: inventory._id, shopStock: { $gte: transferQty } }
        : { _id: inventory._id, godownStock: { $gte: transferQty } };

      const update = isShopToGodown
        ? {
            $inc: { shopStock: -transferQty, godownStock: transferQty },
            $set: { lastMovementAt: new Date() },
          }
        : {
            $inc: { godownStock: -transferQty, shopStock: transferQty },
            $set: { lastMovementAt: new Date() },
          };

      const updated = await Inventory.findOneAndUpdate(query, update, { new: true });

      if (!updated) {
        throw new Error(
          `Concurrent update conflict or insufficient ${isShopToGodown ? 'Shop' : 'Godown'} stock for ${product.name} (${product.sku})`
        );
      }

      totalQty += transferQty;

      transferItemsData.push({
        productId: product._id,
        sku: product.sku,
        productName: product.name,
        unit: product.unit || 'PCS',
        godownAvailableBefore: beforeGodown,
        transferQuantity: transferQty,
        shopAvailableBefore: beforeShop,
      });

      // Create immutable transaction ledger record
      await StockTransaction.create({
        transactionId: generateId('ST-TRF'),
        productId: product._id,
        sku: product.sku,
        productName: product.name,
        type: isShopToGodown ? 'SHOP_TO_GODOWN' : 'GODOWN_TO_SHOP',
        location: 'BOTH',
        quantity: transferQty,
        unit: product.unit || 'PCS',
        beforeGodownStock: beforeGodown,
        afterGodownStock: updated.godownStock,
        beforeShopStock: beforeShop,
        afterShopStock: updated.shopStock,
        referenceId: transferNumber,
        referenceType: 'TRANSFER',
        notes: `Transferred ${transferQty} PCS from ${isShopToGodown ? 'Shop to Godown' : 'Godown to Shop'}. ${remarks}`.trim(),
        performedBy: transferredBy,
      });
    }

    const transferDoc = await StockTransfer.create({
      transferNumber,
      transferDate: new Date(),
      fromLocation: fromLoc,
      toLocation: toLoc,
      items: transferItemsData,
      totalQuantity: totalQty,
      status: 'COMPLETED',
      remarks,
      transferredBy,
    });

    await AuditLog.create({
      user: transferredBy,
      action: `Transferred ${totalQty} PCS from ${fromLoc} to ${toLoc} across ${items.length} items`,
      module: 'TRANSFER',
      referenceId: transferNumber,
      newValue: `From: ${fromLoc}, To: ${toLoc}, Items: ${items.length}, Total PCS: ${totalQty}`,
    });

    return transferDoc;
  }

  static async transferGodownToShop(params: {
    items: Array<{ productId: string; transferQuantity: number }>;
    remarks?: string;
    transferredBy?: string;
  }): Promise<IStockTransfer> {
    return this.transferStock({ ...params, direction: 'GODOWN_TO_SHOP' });
  }

  /**
   * Process Billing Sale from Varun Trade Billing application
   * Deducts ONLY from Shop Stock
   * Guaranteed Idempotency
   */
  static async processBillingSale(
    billData: {
      billId: string;
      billNumber: string;
      customerId?: string;
      items: Array<{
        productId?: string;
        sku?: string;
        productName?: string;
        quantity: number;
      }>;
      billDate?: string | Date;
    },
    idempotencyKey?: string
  ): Promise<{
    success: boolean;
    alreadyProcessed?: boolean;
    status: string;
    message: string;
    billNumber: string;
    items?: any[];
  }> {
    const { billId, billNumber, items } = billData;

    if (!billId || !billNumber) {
      throw new Error('Missing required fields: billId and billNumber');
    }

    if (!items || items.length === 0) {
      throw new Error('Sale must contain at least one item');
    }

    // Step 1: Check Idempotency - Has this bill already been processed?
    const existingEvent = await IntegrationEvent.findOne({
      $or: [
        { externalBillId: billId },
        { billNumber: billNumber },
        ...(idempotencyKey ? [{ idempotencyKey }] : []),
      ],
      eventType: 'BILL_SALE',
    });

    if (existingEvent && existingEvent.status === 'PROCESSED') {
      return {
        success: true,
        alreadyProcessed: true,
        status: 'PROCESSED',
        message: 'Stock for this bill has already been processed (Idempotent response)',
        billNumber: existingEvent.billNumber,
        items: existingEvent.items,
      };
    }

    // Step 2: Validate all items and find inventory
    const validatedItems: Array<{
      product: IProduct;
      inventory: IInventory;
      quantity: number;
    }> = [];

    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        continue;
      }

      // Find product by SKU or productId, slNo, or name (case-insensitive & whitespace-resilient)
      let product: IProduct | null = null;
      if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        product = await Product.findById(item.productId);
      }
      if (!product && item.sku) {
        product = await Product.findOne({ sku: item.sku.trim().toUpperCase() });
      }
      if (!product && (item as any).slNo) {
        product = await Product.findOne({ slNo: Number((item as any).slNo) });
      }
      if (!product && item.productName) {
        const pName = item.productName.trim();
        const escaped = pName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        product = await Product.findOne({
          $or: [
            { name: pName },
            { name: new RegExp(`^${escaped}$`, 'i') },
            { name: new RegExp(`^\\s*${escaped}\\s*$`, 'i') },
          ],
        });

        // If still not found, try flexible space/punctuation regex match
        if (!product) {
          try {
            const cleanPattern = pName
              .split(/\s+/)
              .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
              .join('.*');
            product = await Product.findOne({ name: new RegExp(cleanPattern, 'i') });
          } catch {}
        }
      }

      if (!product) {
        const autoName = String(item.productName || item.sku || '').trim();
        if (autoName) {
          const cleanSku = (item.sku || autoName.replace(/[^A-Za-z0-9]/g, '').slice(0, 4) + '-' + Date.now().toString().slice(-4)).toUpperCase();
          product = await Product.create({
            name: autoName,
            sku: cleanSku,
            category: 'General',
            unit: 'PCS',
            isActive: true,
          });
          await Inventory.create({
            productId: product._id,
            sku: product.sku,
            productName: product.name,
            category: 'General',
            godownStock: 0,
            shopStock: 0,
            minGodownStock: 10,
            minShopStock: 5,
            lastMovementAt: new Date(),
          });
        } else {
          continue;
        }
      }

      let inventory = await Inventory.findOne({ productId: product._id });
      if (!inventory) {
        inventory = await Inventory.create({
          productId: product._id,
          sku: product.sku,
          productName: product.name,
          category: product.category,
          godownStock: 0,
          shopStock: 0,
          minGodownStock: product.minGodownStock || 10,
          minShopStock: product.minShopStock || 5,
          lastMovementAt: new Date(),
        });
      }

      validatedItems.push({
        product,
        inventory,
        quantity: item.quantity,
      });
    }

    if (validatedItems.length === 0) {
      throw new Error('No valid items with quantity > 0 found in bill');
    }

    // Step 3: Perform atomic deduction (from Shop, or Godown if shop stock is low)
    const processedItemsSummary: any[] = [];

    for (const { product, inventory, quantity } of validatedItems) {
      const beforeShop = Number(inventory.shopStock) || 0;
      const beforeGodown = Number(inventory.godownStock) || 0;

      // Always deduct directly from shopStock
      // If shopStock was 0 and godownStock has stock, migrate godownStock to shopStock so shopStock balance is live
      let currentShop = beforeShop;
      let currentGodown = beforeGodown;

      if (currentShop === 0 && currentGodown > 0) {
        currentShop = currentGodown;
        currentGodown = 0;
      }

      const newShopStock = currentShop - quantity;
      const newGodownStock = currentGodown;

      const updated = await Inventory.findByIdAndUpdate(
        inventory._id,
        {
          $set: {
            shopStock: newShopStock,
            godownStock: newGodownStock,
            lastMovementAt: new Date(),
          },
        },
        { new: true }
      );

      // Update product cached stock
      const totalStockAfter = newShopStock + newGodownStock;
      await Product.findByIdAndUpdate(product._id, { $set: { stock: totalStockAfter } });

      processedItemsSummary.push({
        productId: product._id.toString(),
        sku: product.sku,
        productName: product.name,
        quantity,
        shopStockBefore: beforeShop,
        shopStockAfter: newShopStock,
        godownStockBefore: beforeGodown,
        godownStockAfter: newGodownStock,
      });

      // Record transaction
      await StockTransaction.create({
        transactionId: generateId('ST-SALE'),
        productId: product._id,
        sku: product.sku,
        productName: product.name,
        type: 'BILL_SALE',
        location: 'SHOP',
        quantity: -quantity,
        unit: product.unit || 'PCS',
        beforeGodownStock: beforeGodown,
        afterGodownStock: newGodownStock,
        beforeShopStock: beforeShop,
        afterShopStock: newShopStock,
        referenceId: billNumber,
        referenceType: 'BILL',
        externalBillId: billId,
        notes: `Deducted ${quantity} PCS for finalized Bill ${billNumber} from Shop Stock`,
        performedBy: 'Billing Integration',
      });
    }

    // Step 4: Record Integration Event
    await IntegrationEvent.create({
      externalBillId: billId,
      billNumber,
      idempotencyKey,
      eventType: 'BILL_SALE',
      status: 'PROCESSED',
      items: processedItemsSummary,
      rawRequestPayload: billData,
      responsePayload: { status: 'PROCESSED', itemsCount: processedItemsSummary.length },
      processedAt: new Date(),
    });

    await AuditLog.create({
      user: 'Billing Integration',
      action: `Deducted Shop Stock for Bill ${billNumber}`,
      module: 'BILLING_INTEGRATION',
      referenceId: billNumber,
      newValue: `Items processed: ${processedItemsSummary.length}`,
    });

    return {
      success: true,
      status: 'PROCESSED',
      message: 'Shop stock updated successfully',
      billNumber,
      items: processedItemsSummary,
    };
  }

  /**
   * Process Stock Reversal when a finalized Bill is cancelled/deleted in Billing System
   */
  static async processBillingReversal(params: {
    billId?: string;
    billNumber?: string;
    reason?: string;
  }): Promise<{
    success: boolean;
    alreadyReversed?: boolean;
    message: string;
    billNumber: string;
    itemsRestored?: number;
  }> {
    const { billId, billNumber, reason = 'Bill cancelled' } = params;

    if (!billId && !billNumber) {
      throw new Error('Must provide billId or billNumber for reversal');
    }

    const query: any = { eventType: 'BILL_SALE' };
    if (billId) query.externalBillId = billId;
    else if (billNumber) query.billNumber = billNumber;

    const originalEvent = await IntegrationEvent.findOne(query);

    if (!originalEvent) {
      throw new Error(`Original billing sale event not found for bill ${billNumber || billId}`);
    }

    if (originalEvent.status === 'REVERSED') {
      return {
        success: true,
        alreadyReversed: true,
        message: `Stock for Bill ${originalEvent.billNumber} has already been reversed`,
        billNumber: originalEvent.billNumber,
      };
    }

    // Restore shop stock for each item in the original event
    for (const item of originalEvent.items) {
      const inventory = await Inventory.findOne({ sku: item.sku });
      if (inventory) {
        const beforeShop = inventory.shopStock;
        const beforeGodown = inventory.godownStock;

        const updated = await Inventory.findByIdAndUpdate(
          inventory._id,
          {
            $inc: { shopStock: item.quantity },
            $set: { lastMovementAt: new Date() },
          },
          { new: true }
        );

        if (updated) {
          await StockTransaction.create({
            transactionId: generateId('ST-REV'),
            productId: inventory.productId,
            sku: item.sku,
            productName: item.productName,
            type: 'SALE_REVERSAL',
            location: 'SHOP',
            quantity: item.quantity,
            unit: 'PCS',
            beforeGodownStock: beforeGodown,
            afterGodownStock: beforeGodown,
            beforeShopStock: beforeShop,
            afterShopStock: updated.shopStock,
            referenceId: originalEvent.billNumber,
            referenceType: 'BILL',
            externalBillId: originalEvent.externalBillId,
            notes: `Restored ${item.quantity} PCS due to cancellation of Bill ${originalEvent.billNumber}. Reason: ${reason}`,
            performedBy: 'Billing Integration',
          });
        }
      }
    }

    originalEvent.status = 'REVERSED';
    originalEvent.reversedAt = new Date();
    originalEvent.reversalReason = reason;
    await originalEvent.save();

    await AuditLog.create({
      user: 'Billing Integration',
      action: `Reversed stock deduction for cancelled Bill ${originalEvent.billNumber}`,
      module: 'BILLING_INTEGRATION',
      referenceId: originalEvent.billNumber,
      newValue: `Restored ${originalEvent.items.length} item lines. Reason: ${reason}`,
    });

    return {
      success: true,
      message: `Stock successfully reversed for Bill ${originalEvent.billNumber}`,
      billNumber: originalEvent.billNumber,
      itemsRestored: originalEvent.items.length,
    };
  }

  /**
   * Physical Stock Adjustment / Reconciliation
   */
  static async adjustStock(params: {
    productId: string;
    location: 'GODOWN' | 'SHOP';
    physicalQty: number;
    reason: string;
    adjustedBy?: string;
  }): Promise<{ adjustment: IStockAdjustment; inventory: IInventory; transaction: IStockTransaction }> {
    const { productId, location, physicalQty, reason, adjustedBy = 'Admin' } = params;

    if (physicalQty < 0) {
      throw new Error('Physical stock quantity cannot be negative');
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('A valid reason is required for stock adjustment');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error(`Product not found with ID ${productId}`);
    }

    const inventory = await Inventory.findOne({ productId });
    if (!inventory) {
      throw new Error(`Inventory not found for product ${product.name}`);
    }

    const systemQty = location === 'GODOWN' ? inventory.godownStock : inventory.shopStock;
    const adjustmentQty = physicalQty - systemQty; // can be negative (shrinkage) or positive (found stock)

    const beforeGodown = inventory.godownStock;
    const beforeShop = inventory.shopStock;

    if (location === 'GODOWN') {
      inventory.godownStock = physicalQty;
    } else {
      inventory.shopStock = physicalQty;
    }
    inventory.lastMovementAt = new Date();
    await inventory.save();

    const adjustmentNumber = generateId('ADJ');

    const adjustment = await StockAdjustment.create({
      adjustmentNumber,
      productId: product._id,
      sku: product.sku,
      productName: product.name,
      location,
      systemQty,
      physicalQty,
      adjustmentQty,
      reason,
      adjustedBy,
    });

    const transaction = await StockTransaction.create({
      transactionId: generateId('ST-ADJ'),
      productId: product._id,
      sku: product.sku,
      productName: product.name,
      type: 'STOCK_ADJUSTMENT',
      location,
      quantity: adjustmentQty,
      unit: product.unit || 'PCS',
      beforeGodownStock: beforeGodown,
      afterGodownStock: inventory.godownStock,
      beforeShopStock: beforeShop,
      afterShopStock: inventory.shopStock,
      referenceId: adjustmentNumber,
      referenceType: 'ADJUSTMENT',
      notes: `Physical audit adjustment at ${location}. Variance: ${adjustmentQty > 0 ? '+' : ''}${adjustmentQty} PCS. Reason: ${reason}`,
      performedBy: adjustedBy,
    });

    await AuditLog.create({
      user: adjustedBy,
      action: `Adjusted ${location} stock for ${product.name} from ${systemQty} to ${physicalQty} PCS`,
      module: 'ADJUSTMENT',
      referenceId: adjustmentNumber,
      oldValue: `${location} Qty: ${systemQty}`,
      newValue: `${location} Qty: ${physicalQty} (Diff: ${adjustmentQty})`,
    });

    return { adjustment, inventory, transaction };
  }
}
