require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { connectDB, disconnectDB } = require('../config/db');
const { seedData } = require('../services/seedService');

async function run() {
  const isReset = process.argv.includes('--reset');
  console.log(`[Seed Script] Initializing seeding process (Reset: ${isReset})...`);

  try {
    await connectDB({ isSeedScript: true });
    const result = await seedData({ reset: isReset });
    console.log('[Seed Script] Seeding finished successfully:', result);
  } catch (err) {
    console.error('[Seed Script] Error during seeding:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    console.log('[Seed Script] Database disconnected.');
    process.exit(0);
  }
}

run();
