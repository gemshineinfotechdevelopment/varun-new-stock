import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  slNo?: number;
  name: string;
  sku: string;
  category: string;
  brand?: string;
  unit: string;
  mrp?: number;
  discount?: number;
  rate?: number;
  stock?: number;
  pricing?: any;
  minGodownStock: number;
  minShopStock: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    slNo: { type: Number },
    name: { type: String, required: true, trim: true },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: function (this: any) {
        const rawName = (this.name || 'ITEM').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
        const prefix = rawName || 'ITEM';
        const num = this.slNo || Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${num}`;
      },
    },
    category: { type: String, required: true, trim: true, default: 'General' },
    brand: { type: String, default: '', trim: true },
    unit: { type: String, default: 'PCS', trim: true },
    mrp: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    pricing: { type: Schema.Types.Mixed },
    minGodownStock: { type: Number, default: 10, min: 0 },
    minShopStock: { type: Number, default: 5, min: 0 },
    description: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    strict: false,
  }
);

ProductSchema.pre('validate', function (next) {
  if (!this.sku || !this.sku.trim()) {
    const rawName = (this.name || 'ITEM').replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase();
    const prefix = rawName || 'ITEM';
    const num = this.slNo || Math.floor(1000 + Math.random() * 9000);
    this.sku = `${prefix}-${num}`;
  }
  if (this.sku) {
    this.sku = this.sku.trim().toUpperCase();
  }
  next();
});

ProductSchema.index({ name: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ sku: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);

