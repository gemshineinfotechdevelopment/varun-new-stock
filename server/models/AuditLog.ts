import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  user: string;
  action: string;
  module:
    | 'INVENTORY'
    | 'TRANSFER'
    | 'ADJUSTMENT'
    | 'BILLING_INTEGRATION'
    | 'PRODUCT'
    | 'STOCK'
    | 'CATEGORY'
    | 'AUTH'
    | 'SETTINGS';
  referenceId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: String, required: true, default: 'System' },
    action: { type: String, required: true },
    module: {
      type: String,
      required: true,
      enum: [
        'INVENTORY',
        'TRANSFER',
        'ADJUSTMENT',
        'BILLING_INTEGRATION',
        'PRODUCT',
        'STOCK',
        'CATEGORY',
        'AUTH',
        'SETTINGS',
      ],
      index: true,
    },
    referenceId: { type: String, default: '' },
    oldValue: { type: String, default: '' },
    newValue: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ module: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
