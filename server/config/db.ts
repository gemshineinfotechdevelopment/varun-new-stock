import mongoose from 'mongoose';

let memoryServerInstance: any = null;

export const connectDB = async (retryCount = 0): Promise<void> => {
  let uri =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI ||
    'mongodb://127.0.0.1:27017/varun_trade_db';

  if (uri.includes('<') && uri.includes('>')) {
    uri = uri.replace(/<([^>]+)>/g, '$1');
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
      socketTimeoutMS: 45000,
    });
    console.log(`=============================================`);
    console.log(`[Database] MongoDB Connected Successfully!`);
    console.log(`[Database Host] ${conn.connection.host}:${conn.connection.port || 'default'}`);
    console.log(`[Database Name] ${conn.connection.name}`);
    console.log(`=============================================`);
  } catch (error: any) {
    console.warn(`[Database Notice] Could not connect to primary MongoDB URI (${uri}): ${error.message}`);

    // If local/VPS MongoDB is not currently running, start MongoMemoryServer as fallback
    if (process.env.NODE_ENV !== 'production' || !process.env.MONGODB_URI) {
      try {
        console.log(`[Database Fallback] Starting MongoMemoryServer for standalone development & testing...`);
        const { MongoMemoryServer } = require('mongodb-memory-server');
        if (!memoryServerInstance) {
          memoryServerInstance = await MongoMemoryServer.create();
        }
        const memUri = memoryServerInstance.getUri();
        const memConn = await mongoose.connect(memUri);
        console.log(`=============================================`);
        console.log(`[Database Fallback] Connected to In-Memory MongoDB Server!`);
        console.log(`[Database URI] ${memUri}`);
        console.log(`=============================================`);
        return;
      } catch (memErr) {
        console.error(`[Database Error] MongoMemoryServer fallback failed:`, memErr);
      }
    }

    if (retryCount < 3) {
      console.log(`[Database] Retrying connection in 3 seconds...`);
      setTimeout(() => connectDB(retryCount + 1), 3000);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[Database] MongoDB disconnected.');
});

mongoose.connection.on('error', (err: any) => {
  console.error('[Database Error] MongoDB connection error:', err);
});
