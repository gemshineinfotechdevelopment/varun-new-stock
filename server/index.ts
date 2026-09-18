import express, { type Application, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

import { connectDB } from './config/db';
import { seedDatabase } from './seedData';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import transferRoutes from './routes/transferRoutes';
import adjustmentRoutes from './routes/adjustmentRoutes';
import transactionRoutes from './routes/transactionRoutes';
import reportRoutes from './routes/reportRoutes';
import integrationRoutes from './routes/integrationRoutes';
import settingsRoutes from './routes/settingsRoutes';
import auditLogRoutes from './routes/auditLogRoutes';

const app: Application = express();
const PORT = process.env.PORT || 5020;

// Connect Database & Seed default data
connectDB().then(() => {
  seedDatabase();
});

// Configure CORS Origins
const envOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o: string) => o.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  'https://varun-traders-billing.gemshine.tech',
  'http://varun-traders-billing.gemshine.tech',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5020',
  'http://127.0.0.1:5020',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow server-to-server and requests without origin headers
    if (!origin) return callback(null, true);

    if (process.env.CORS_ORIGIN === '*' || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);

    if (isLocalhost || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    console.warn(`[CORS Blocked] Origin not allowed: ${origin}`);
    return callback(new Error(`CORS origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key', 'x-idempotency-key', 'x-api-key', 'x-integration-key'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check Route
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    app: 'Varun Trade Stock Maintenance',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'Varun Trade Stock Maintenance API',
    health: '/api/health',
    integration: '/api/integration/billing/health',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/adjustments', adjustmentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/integration', integrationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Global Error Handler
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` 📦 Varun Trade Stock Maintenance Server running on port ${PORT}`);
  console.log(` 🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(` ⚡ Integration API: http://localhost:${PORT}/api/integration/billing/sale`);
  console.log(` 🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=======================================================`);
});

export default app;
