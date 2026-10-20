const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

let memoryServerInstance = null;
const DATA_DIR = path.resolve(__dirname, '../../.data');
const ACTIVE_INFO_PATH = path.join(DATA_DIR, 'active_mongo.json');

/**
 * Checks if a MongoDB URI is reachable within a timeout
 */
async function testConnection(uri, timeoutMs = 2000) {
  try {
    const conn = await mongoose.createConnection(uri, {
      serverSelectionTimeoutMS: timeoutMs,
      connectTimeoutMS: timeoutMs
    }).asPromise();
    await conn.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Connect to MongoDB using MONGO_URI, or existing active memory server, or start a persistent memory server.
 */
async function connectDB(options = {}) {
  const { isSeedScript = false } = options;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // 1. Try configured MONGO_URI from environment
  const envUri = process.env.MONGO_URI;
  if (envUri) {
    console.log(`[DB] Attempting connection to configured MONGO_URI (${envUri})...`);
    const isReachable = await testConnection(envUri, 1500);
    if (isReachable) {
      await mongoose.connect(envUri);
      console.log(`[DB] Successfully connected to configured MongoDB: ${envUri}`);
      return { uri: envUri, isMemory: false };
    }
    console.warn(`[DB] Configured MONGO_URI is unreachable. Falling back to persistent MongoMemoryServer.`);
  }

  // 2. Check if an active in-memory instance is already running (e.g. server already started)
  if (fs.existsSync(ACTIVE_INFO_PATH)) {
    try {
      const info = JSON.parse(fs.readFileSync(ACTIVE_INFO_PATH, 'utf-8'));
      if (info && info.uri) {
        const isReachable = await testConnection(info.uri, 1500);
        if (isReachable) {
          console.log(`[DB] Connecting to existing active persistent MongoDB at ${info.uri}...`);
          await mongoose.connect(info.uri);
          console.log(`[DB] Connected to existing persistent MongoDB instance.`);
          return { uri: info.uri, isMemory: true, shared: true };
        }
      }
    } catch {
      // Ignore JSON parse errors or dead lock files
    }
  }

  // 3. Start a persistent MongoMemoryServer using server/.data
  console.log(`[DB] Starting persistent MongoMemoryServer with dbPath: ${DATA_DIR}...`);
  try {
    memoryServerInstance = await MongoMemoryServer.create({
      instance: {
        dbPath: DATA_DIR,
        storageEngine: 'wiredTiger'
      }
    });

    const uri = memoryServerInstance.getUri();
    fs.writeFileSync(ACTIVE_INFO_PATH, JSON.stringify({ uri, pid: process.pid, startedAt: new Date().toISOString() }));

    await mongoose.connect(uri);
    console.log(`[DB] Successfully connected to persistent MongoMemoryServer: ${uri}`);

    // Register cleanup handlers on graceful shutdown
    const cleanup = async () => {
      try {
        if (fs.existsSync(ACTIVE_INFO_PATH)) {
          fs.unlinkSync(ACTIVE_INFO_PATH);
        }
        if (memoryServerInstance) {
          await memoryServerInstance.stop();
        }
        await mongoose.disconnect();
      } catch (err) {
        // Suppress shutdown errors
      }
    };

    process.on('SIGINT', async () => {
      await cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await cleanup();
      process.exit(0);
    });

    return { uri, isMemory: true, shared: false };
  } catch (err) {
    console.error(`[DB] Failed to initialize MongoMemoryServer:`, err.message);
    throw err;
  }
}

async function disconnectDB() {
  if (fs.existsSync(ACTIVE_INFO_PATH)) {
    try {
      const info = JSON.parse(fs.readFileSync(ACTIVE_INFO_PATH, 'utf-8'));
      if (info.pid === process.pid) {
        fs.unlinkSync(ACTIVE_INFO_PATH);
      }
    } catch {
      // Ignore
    }
  }
  await mongoose.disconnect();
  if (memoryServerInstance) {
    await memoryServerInstance.stop();
    memoryServerInstance = null;
  }
}

module.exports = {
  connectDB,
  disconnectDB
};
