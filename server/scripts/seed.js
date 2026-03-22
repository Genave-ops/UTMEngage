// Script to seed the Supabase database with initial data
// Run with: node scripts/seed.js

require('dotenv').config();
const db = require('../src/config/database');

async function main() {
  try {
    console.log('🚀 Starting database seed...\n');

    // Initialize connection
    await db.initialize();

    // Seed the database
    await db.seed();

    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    process.exit(1);
  }
}

main();
