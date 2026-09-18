import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB } from './config/db';
import { User } from './models/User';
import { Category } from './models/Category';
import { Product } from './models/Product';
import { Settings } from './models/Settings';
import { StockService } from './services/stockService';

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log('[Seed] Checking database initialization...');

    // 1. Seed Admin User
    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').toLowerCase().trim();
    const existingAdmin = await User.findOne({ username: adminUsername });

    if (!existingAdmin) {
      const password = process.env.ADMIN_PASSWORD || 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      await User.create({
        username: adminUsername,
        password: hashedPassword,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        isActive: true,
      });
      console.log(`[Seed] ✅ Default Super Admin created: '${adminUsername}' / '${password}'`);
    }

    // 2. Seed Settings
    const existingSettings = await Settings.findOne();
    if (!existingSettings) {
      await Settings.create({
        companyName: 'Varun Trade Stock Maintenance',
        godownName: 'Main Godown (Warehouse)',
        shopName: 'Varun Trade Shop',
        integrationApiKey: process.env.BILLING_INTEGRATION_SECRET || 'varun_stock_integration_secret_key_xyz890',
        billingApiUrl: process.env.BILLING_API_URL || 'http://localhost:5011',
        autoSyncEnabled: true,
      });
      console.log(`[Seed] ✅ Default Settings created.`);
    }

    // 3. Seed Default Categories if none exist
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      const sampleCategories = [
        { name: 'Hardware & Fittings', description: 'Locks, handles, hinges, screws' },
        { name: 'Pipes & Sanitary', description: 'PVC, CPVC pipes and bathroom accessories' },
        { name: 'Electricals', description: 'Wires, switches, sockets, LED lights' },
        { name: 'Paints & Chemicals', description: 'Emulsions, primers, thinners, sealants' },
        { name: 'Pots & Gardening', description: 'Flower pots, garden tools, planters' },
      ];

      for (const cat of sampleCategories) {
        await Category.create(cat);
      }
      console.log(`[Seed] ✅ Seeded ${sampleCategories.length} default categories.`);
    }

    // 4. Sync from Billing Particulars if available
    try {
      await StockService.syncFromBillingParticulars();
    } catch (syncErr) {
      console.warn('[Seed] Billing sync note:', syncErr);
    }

    // 5. Seed Sample Products with Opening Stock ONLY if database is still completely empty
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      const sampleProducts = [
        {
          name: 'Flower Pot 100 Red',
          sku: 'FP-100-RED',
          category: 'Pots & Gardening',
          brand: 'Varun Plastics',
          unit: 'PCS',
          minGodownStock: 50,
          minShopStock: 20,
          godownOpening: 500,
          shopOpening: 100,
        },
        {
          name: 'Flower Pot 120 Green',
          sku: 'FP-120-GRN',
          category: 'Pots & Gardening',
          brand: 'Varun Plastics',
          unit: 'PCS',
          minGodownStock: 40,
          minShopStock: 15,
          godownOpening: 350,
          shopOpening: 80,
        },
        {
          name: 'PVC Pipe 1 Inch 10FT',
          sku: 'PVC-PIPE-1IN',
          category: 'Pipes & Sanitary',
          brand: 'Supreme',
          unit: 'PCS',
          minGodownStock: 100,
          minShopStock: 30,
          godownOpening: 800,
          shopOpening: 150,
        },
        {
          name: 'Brass Door Handle 8 Inch',
          sku: 'HD-BRASS-8',
          category: 'Hardware & Fittings',
          brand: 'Godrej',
          unit: 'PCS',
          minGodownStock: 30,
          minShopStock: 10,
          godownOpening: 200,
          shopOpening: 45,
        },
        {
          name: 'LED Panel Light 15W Warm White',
          sku: 'LED-15W-WW',
          category: 'Electricals',
          brand: 'Philips',
          unit: 'PCS',
          minGodownStock: 50,
          minShopStock: 25,
          godownOpening: 400,
          shopOpening: 90,
        },
      ];

      for (const item of sampleProducts) {
        const product = await Product.create({
          name: item.name,
          sku: item.sku,
          category: item.category,
          brand: item.brand,
          unit: item.unit,
          minGodownStock: item.minGodownStock,
          minShopStock: item.minShopStock,
          isActive: true,
        });

        await StockService.setOpeningStock({
          productId: product._id,
          godownQty: item.godownOpening,
          shopQty: item.shopOpening,
          user: 'System Seed',
        });
      }
      console.log(`[Seed] ✅ Seeded ${sampleProducts.length} initial products with opening stock.`);
    }

    console.log('[Seed] Database initialization check complete.');
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
  }
};

// Run standalone if executed directly
if (require.main === module) {
  connectDB().then(async () => {
    await seedDatabase();
    await mongoose.disconnect();
    process.exit(0);
  });
}
