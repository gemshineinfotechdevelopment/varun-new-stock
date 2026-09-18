import mongoose, { Document, Schema } from 'mongoose';

export interface IStockTransferItem {
  productId: mongoose.Types.ObjectId;
  sku: string;
  productName: string;
  unit: string;
  godownAvailableBefore: number;
  transferQuantity: number;
  shopAvailableBefore: number;
}

export interface IStockTransfer extends Document {
  transferNumber: string; // TR-000101
  transferDate: Date;
  fromLocation: string; // 'GODOWN'
  toLocation: string; // 'SHOP'
  items: IStockTransferItem[];
  totalQuantity: number;
  status: 'COMPLETED' | 'CANCELLED';
  remarks?: string;
  transferredBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockTransferItemSchema = new Schema<IStockTransferItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    sku: { type: String, required: true, uppercase: true, trim: true },
    productName: { type: String, required: true },
    unit: { type: String, default: 'PCS' },
    godownAvailableBefore: { type: Number, required: true },
    transferQuantity: { type: Number, required: true, min: 1 },
    shopAvailableBefore: { type: Number, required: true },
  },
  { _id: false }
);

const StockTransferSchema = new Schema<IStockTransfer>(
  {
    transferNumber: { type: String, required: true, unique: true, index: true },
    transferDate: { type: Date, default: Date.now },
    fromLocation: { type: String, default: 'GODOWN' },
    toLocation: { type: String, default: 'SHOP' },
    items: [StockTransferItemSchema],
    totalQuantity: { type: Number, required: true },
    status: { type: String, enum: ['COMPLETED', 'CANCELLED'], default: 'COMPLETED' },
    remarks: { type: String, default: '' },
    transferredBy: { type: String, default: 'Admin' },
  },
  {
    timestamps: true,
  }
);

StockTransferSchema.index({ createdAt: -1 });

export const StockTransfer = mongoose.model<IStockTransfer>('StockTransfer', StockTransferSchema);
