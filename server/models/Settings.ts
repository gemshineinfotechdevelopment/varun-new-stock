import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  companyName: string;
  godownName: string;
  shopName: string;
  integrationApiKey: string;
  billingApiUrl: string;
  autoSyncEnabled: boolean;
  lowStockEmailAlerts: boolean;
  contactEmail?: string;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    companyName: { type: String, default: 'Varun Traders' },
    godownName: { type: String, default: 'Main Godown (Warehouse)' },
    shopName: { type: String, default: 'Varun Traders Shop' },
    integrationApiKey: { type: String, default: 'varun_stock_integration_secret_key_xyz890' },
    billingApiUrl: { type: String, default: 'http://localhost:5011' },
    autoSyncEnabled: { type: Boolean, default: true },
    lowStockEmailAlerts: { type: Boolean, default: false },
    contactEmail: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
