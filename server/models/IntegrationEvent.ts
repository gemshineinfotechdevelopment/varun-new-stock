import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegrationEventItem {
  productId?: string;
  sku: string;
  productName: string;
  quantity: number;
  shopStockBefore?: number;
  shopStockAfter?: number;
}

export interface IIntegrationEvent extends Document {
  externalBillId: string; // Mongo Bill ID from Billing System (Unique index)
  billNumber: string; // VT-1025
  idempotencyKey?: string;
  eventType: 'BILL_SALE' | 'SALE_REVERSAL';
  status: 'PROCESSED' | 'REVERSED' | 'FAILED' | 'RETRYING';
  items: IIntegrationEventItem[];
  rawRequestPayload: any;
  responsePayload: any;
  failureReason?: string;
  reversalReason?: string;
  reversedAt?: Date;
  processedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationEventItemSchema = new Schema<IIntegrationEventItem>(
  {
    productId: { type: String },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    shopStockBefore: { type: Number },
    shopStockAfter: { type: Number },
  },
  { _id: false }
);

const IntegrationEventSchema = new Schema<IIntegrationEvent>(
  {
    externalBillId: { type: String, required: true, index: true },
    billNumber: { type: String, required: true, index: true },
    idempotencyKey: { type: String, index: true },
    eventType: { type: String, enum: ['BILL_SALE', 'SALE_REVERSAL'], required: true },
    status: {
      type: String,
      enum: ['PROCESSED', 'REVERSED', 'FAILED', 'RETRYING'],
      default: 'PROCESSED',
      index: true,
    },
    items: [IntegrationEventItemSchema],
    rawRequestPayload: { type: Schema.Types.Mixed },
    responsePayload: { type: Schema.Types.Mixed },
    failureReason: { type: String },
    reversalReason: { type: String },
    reversedAt: { type: Date },
    processedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

IntegrationEventSchema.index({ externalBillId: 1, eventType: 1 });
IntegrationEventSchema.index({ createdAt: -1 });

export const IntegrationEvent = mongoose.model<IIntegrationEvent>(
  'IntegrationEvent',
  IntegrationEventSchema
);
