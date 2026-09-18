import mongoose, { Document, Schema } from 'mongoose';

export interface IStockAdjustment extends Document {
  adjustmentNumber: string; // ADJ-000101
  productId: mongoose.Types.ObjectId;
  sku: string;
  productName: string;
  location: 'GODOWN' | 'SHOP';
  systemQty: number;
  physicalQty: number;
  adjustmentQty: number; // physicalQty - systemQty (can be negative or positive)
  reason: string;
  adjustedBy: string;
  createdAt: Date;
}

const StockAdjustmentSchema = new Schema<IStockAdjustment>(
  {
    adjustmentNumber: { type: String, required: true, unique: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    productName: { type: String, required: true },
    location: { type: String, required: true, enum: ['GODOWN', 'SHOP'] },
    systemQty: { type: Number, required: true },
    physicalQty: { type: Number, required: true, min: 0 },
    adjustmentQty: { type: Number, required: true },
    reason: { type: String, required: true, trim: true },
    adjustedBy: { type: String, default: 'Admin' },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

StockAdjustmentSchema.index({ createdAt: -1 });

export const StockAdjustment = mongoose.model<IStockAdjustment>(
  'StockAdjustment',
  StockAdjustmentSchema
);
