const { Client } = require('pg');

const regions = [
  'aws-0-us-east-1',
  'aws-0-us-west-1',
  'aws-0-eu-west-1',
  'aws-0-eu-central-1',
  'aws-0-ap-southeast-1',
  'aws-0-ap-northeast-1',
  'aws-0-sa-east-1'
];

const password = 'T7GYJgwE7eY9degR';
const projectRef = 'csrtomrowpdnnaqpsmbm';

async function tryConnection(region) {
  const client = new Client({
    host: `${region}.pooler.supabase.com`,
    port: 5432,
    database: 'postgres',
    user: `postgres.${projectRef}`,
    password: password,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log(`✅ SUCCESS: ${region}`);
    await client.end();
    return region;
  } catch (error) {
    console.log(`❌ ${region}: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log('Testing Supabase regions...\n');

  for (const region of regions) {
    const result = await tryConnection(region);
    if (result) {
      console.log(`\nWorking region found: ${result}`);
      process.exit(0);
    }
  }

  console.log('\nNo working region found. Please check the connection string from Supabase Dashboard.');
}

main();
