// Standalone seed script for MongoDB
require('dotenv').config();
const db = require('../config/database');

async function runSeed() {
  try {
    console.log('Initializing database connection...');
    await db.initialize();

    console.log('Running database seed...');
    await db.seed();

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

runSeed();
