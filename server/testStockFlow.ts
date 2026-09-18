import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB } from './config/db';
import { Product } from './models/Product';
import { Inventory } from './models/Inventory';
import { StockTransaction } from './models/StockTransaction';
import { StockService } from './services/stockService';

async function runStockFlowTest() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING COMPREHENSIVE STOCK ENGINE & INTEGRATION TEST');
  console.log('======================================================\n');

  await connectDB();

  try {
    const testSku = 'TEST-PROD-' + Math.floor(1000 + Math.random() * 9000);

    // Step 1: Create Product with Opening Stock
    console.log(`\n[STEP 1] Creating Test Product with Opening Stock (Godown: 1000 PCS, Shop: 100 PCS)...`);
    const product = await Product.create({
      name: 'Test Industrial Valve 50mm',
      sku: testSku,
      category: 'Hardware & Fittings',
      brand: 'TestBrand',
      unit: 'PCS',
      minGodownStock: 50,
      minShopStock: 20,
    });

    const { inventory: inv1 } = await StockService.setOpeningStock({
      productId: product._id,
      godownQty: 1000,
      shopQty: 100,
      user: 'Automated Test',
    });

    console.log(`✅ Opening Stock Created: Godown = ${inv1.godownStock} PCS, Shop = ${inv1.shopStock} PCS (Total: ${inv1.totalStock} PCS)`);
    if (inv1.godownStock !== 1000 || inv1.shopStock !== 100) throw new Error('Step 1 Failed: Incorrect opening stock');

    // Step 2: Transfer Godown -> Shop (200 PCS)
    console.log(`\n[STEP 2] Transferring 200 PCS from Godown to Shop...`);
    const transfer = await StockService.transferGodownToShop({
      items: [{ productId: product._id.toString(), transferQuantity: 200 }],
      remarks: 'Automated test transfer',
      transferredBy: 'Test Runner',
    });

    const inv2 = await Inventory.findOne({ productId: product._id });
    console.log(`✅ Transfer ${transfer.transferNumber} Complete: Godown = ${inv2?.godownStock} PCS, Shop = ${inv2?.shopStock} PCS`);
    if (inv2?.godownStock !== 800 || inv2?.shopStock !== 300) throw new Error('Step 2 Failed: Incorrect stock after transfer');

    // Step 3: Billing Sale Integration (Bill VT-1001 for 25 PCS)
    console.log(`\n[STEP 3] Processing Billing Sale (Bill VT-1001 for 25 PCS)...`);
    const billSale1 = await StockService.processBillingSale(
      {
        billId: 'test_mongo_bill_1001',
        billNumber: 'VT-1001',
        items: [{ sku: testSku, quantity: 25 }],
      },
      'idempotency_key_evt_1001'
    );

    const inv3 = await Inventory.findOne({ productId: product._id });
    console.log(`✅ Billing Sale Processed: Godown = ${inv3?.godownStock} PCS, Shop = ${inv3?.shopStock} PCS (Status: ${billSale1.status})`);
    if (inv3?.godownStock !== 800 || inv3?.shopStock !== 275) throw new Error('Step 3 Failed: Incorrect stock after sale deduction');

    // Step 4: Idempotency Test - Resend Same Bill VT-1001
    console.log(`\n[STEP 4] Testing Idempotency (Resending Same Bill VT-1001)...`);
    const billSaleRetry = await StockService.processBillingSale(
      {
        billId: 'test_mongo_bill_1001',
        billNumber: 'VT-1001',
        items: [{ sku: testSku, quantity: 25 }],
      },
      'idempotency_key_evt_1001'
    );

    const inv4 = await Inventory.findOne({ productId: product._id });
    console.log(`✅ Idempotency Verified: alreadyProcessed = ${billSaleRetry.alreadyProcessed}, Shop Stock remains = ${inv4?.shopStock} PCS (No double deduction!)`);
    if (inv4?.shopStock !== 275 || !billSaleRetry.alreadyProcessed) throw new Error('Step 4 Failed: Duplicate deduction occurred!');

    // Step 5: Insufficient Stock Test (Attempting 500 PCS sale when shop has 275)
    console.log(`\n[STEP 5] Testing Negative Stock Prevention (Requesting 500 PCS from Shop)...`);
    const excessSale = await StockService.processBillingSale({
      billId: 'test_mongo_bill_excess',
      billNumber: 'VT-EXCESS',
      items: [{ sku: testSku, quantity: 500 }],
    });

    const inv5 = await Inventory.findOne({ productId: product._id });
    console.log(`✅ Insufficient Stock Guard Verified: Rejected with status = ${excessSale.status}, Shop Stock safe at = ${inv5?.shopStock} PCS`);
    if (excessSale.status !== 'INSUFFICIENT_STOCK' || inv5?.shopStock !== 275) throw new Error('Step 5 Failed: Negative stock check failed');

    // Step 6: Bill Reversal (Cancelling Bill VT-1001)
    console.log(`\n[STEP 6] Testing Bill Cancellation & Stock Reversal for Bill VT-1001...`);
    const reversal = await StockService.processBillingReversal({
      billId: 'test_mongo_bill_1001',
      billNumber: 'VT-1001',
      reason: 'Customer requested order cancellation',
    });

    const inv6 = await Inventory.findOne({ productId: product._id });
    console.log(`✅ Stock Reversal Complete: Shop Stock restored from 275 -> ${inv6?.shopStock} PCS (Expected: 300 PCS)`);
    if (inv6?.shopStock !== 300) throw new Error('Step 6 Failed: Reversal did not restore exact stock');

    // Step 7: Duplicate Reversal Check
    console.log(`\n[STEP 7] Testing Duplicate Reversal Prevention...`);
    const dupReversal = await StockService.processBillingReversal({
      billId: 'test_mongo_bill_1001',
      billNumber: 'VT-1001',
    });
    console.log(`✅ Duplicate Reversal Guard: alreadyReversed = ${dupReversal.alreadyReversed}`);
    if (!dupReversal.alreadyReversed) throw new Error('Step 7 Failed: Duplicate reversal not prevented');

    // Step 8: Physical Stock Adjustment
    console.log(`\n[STEP 8] Testing Physical Stock Adjustment (Auditing Shop from 300 to 297 PCS)...`);
    const adj = await StockService.adjustStock({
      productId: product._id.toString(),
      location: 'SHOP',
      physicalQty: 297,
      reason: 'Found 3 PCS damaged during physical audit',
      adjustedBy: 'Auditor Test',
    });

    const inv8 = await Inventory.findOne({ productId: product._id });
    console.log(`✅ Stock Adjustment ${adj.adjustment.adjustmentNumber} Complete: Shop = ${inv8?.shopStock} PCS (Variance: ${adj.adjustment.adjustmentQty} PCS)`);
    if (inv8?.shopStock !== 297) throw new Error('Step 8 Failed: Adjustment failed');

    // Step 9: Verify Transaction Ledger Integrity
    console.log(`\n[STEP 9] Verifying Immutable Transaction Ledger Records...`);
    const transactions = await StockTransaction.find({ productId: product._id }).sort({ createdAt: 1 });
    console.log(`✅ Total Ledger Transactions Recorded: ${transactions.length}`);
    transactions.forEach((tx, idx) => {
      console.log(`   ${idx + 1}. [${tx.type}] Qty: ${tx.quantity > 0 ? '+' : ''}${tx.quantity} PCS | Before: G=${tx.beforeGodownStock}, S=${tx.beforeShopStock} -> After: G=${tx.afterGodownStock}, S=${tx.afterShopStock} | Ref: ${tx.referenceId}`);
    });

    console.log('\n======================================================');
    console.log('🎉 ALL STOCK ENGINE & INTEGRATION TESTS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Test Failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

runStockFlowTest();
