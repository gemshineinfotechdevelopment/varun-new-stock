import mongoose, { Document, Schema } from 'mongoose';

export type TransactionType =
  | 'OPENING_STOCK'
  | 'GODOWN_IN'
  | 'GODOWN_OUT'
  | 'SHOP_IN'
  | 'SHOP_OUT'
  | 'GODOWN_TO_SHOP'
  | 'SHOP_TO_GODOWN'
  | 'BILL_SALE'
  | 'SALE_REVERSAL'
  | 'STOCK_ADJUSTMENT';

export type StockLocation = 'GODOWN' | 'SHOP' | 'BOTH';

export interface IStockTransaction extends Document {
  transactionId: string;
  productId: mongoose.Types.ObjectId;
  sku: string;
  productName: string;
  type: TransactionType;
  location: StockLocation;
  quantity: number;
  unit: string;
  beforeGodownStock: number;
  afterGodownStock: number;
  beforeShopStock: number;
  afterShopStock: number;
  referenceId?: string;
  referenceType?: 'BILL' | 'TRANSFER' | 'ADJUSTMENT' | 'MANUAL' | 'OPENING';
  externalBillId?: string;
  notes?: string;
  performedBy: string;
  createdAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    transactionId: { type: String, required: true, unique: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    productName: { type: String, required: true, trim: true },
    type: {
      type: String,
      required: true,
      enum: [
        'OPENING_STOCK',
        'GODOWN_IN',
        'GODOWN_OUT',
        'SHOP_IN',
        'SHOP_OUT',
        'GODOWN_TO_SHOP',
        'SHOP_TO_GODOWN',
        'BILL_SALE',
        'SALE_REVERSAL',
        'STOCK_ADJUSTMENT',
      ],
    },
    location: {
      type: String,
      required: true,
      enum: ['GODOWN', 'SHOP', 'BOTH'],
    },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'PCS' },
    beforeGodownStock: { type: Number, required: true },
    afterGodownStock: { type: Number, required: true },
    beforeShopStock: { type: Number, required: true },
    afterShopStock: { type: Number, required: true },
    referenceId: { type: String, default: '' },
    referenceType: {
      type: String,
      enum: ['BILL', 'TRANSFER', 'ADJUSTMENT', 'MANUAL', 'OPENING'],
      default: 'MANUAL',
    },
    externalBillId: { type: String, default: '' },
    notes: { type: String, default: '' },
    performedBy: { type: String, default: 'System' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

StockTransactionSchema.index({ createdAt: -1 });
StockTransactionSchema.index({ productId: 1, createdAt: -1 });
StockTransactionSchema.index({ sku: 1, createdAt: -1 });
StockTransactionSchema.index({ type: 1, createdAt: -1 });
StockTransactionSchema.index({ referenceId: 1 });
StockTransactionSchema.index({ externalBillId: 1 });

export const StockTransaction = mongoose.model<IStockTransaction>(
  'StockTransaction',
  StockTransactionSchema
);
