import mongoose, { Document, Schema } from 'mongoose';

export interface IInventory extends Document {
  productId: mongoose.Types.ObjectId;
  sku: string;
  productName: string;
  category: string;
  godownStock: number;
  shopStock: number;
  minGodownStock: number;
  minShopStock: number;
  totalStock: number;
  lastMovementAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    sku: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
      default: function (this: any) {
        const rawName = (this.productName || 'ITEM').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
        const prefix = rawName || 'ITEM';
        return `${prefix}-${Date.now().toString().slice(-4)}`;
      },
    },
    productName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, default: 'General' },
    godownStock: { type: Number, required: true, default: 0, min: 0 },
    shopStock: { type: Number, required: true, default: 0, min: 0 },
    minGodownStock: { type: Number, default: 10, min: 0 },
    minShopStock: { type: Number, default: 5, min: 0 },
    lastMovementAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

InventorySchema.pre('validate', function (next) {
  if (!this.sku || !this.sku.trim()) {
    const rawName = (this.productName || 'ITEM').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const prefix = rawName || 'ITEM';
    this.sku = `${prefix}-${Date.now().toString().slice(-4)}`;
  }
  if (this.sku) {
    this.sku = this.sku.trim().toUpperCase();
  }
  next();
});

// Virtual field for totalStock = godownStock + shopStock
InventorySchema.virtual('totalStock').get(function (this: IInventory) {
  return (this.godownStock || 0) + (this.shopStock || 0);
});

InventorySchema.index({ category: 1 });
InventorySchema.index({ godownStock: 1 });
InventorySchema.index({ shopStock: 1 });

export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);
