import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

const candidateEnvFiles = ['.env.local', '.env'];
let loadedEnvPath = null;

for (const p of candidateEnvFiles) {
  const full = path.resolve(process.cwd(), p);
  if (fs.existsSync(full)) {
    dotenv.config({ path: full });
    loadedEnvPath = full;
    break;
  }
}

console.log('--- Connection Test ---');
console.log('Loaded env: ' + (loadedEnvPath ? loadedEnvPath : 'none (process env only)'));

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ Error: MONGODB_URI is not defined in your env file!');
  process.exit(1);
}

console.log('Attempting to connect to Atlas...');

async function main() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    await client.db().admin().ping();
    console.log('✅ SUCCESS: Connected to MongoDB Atlas successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ CONNECTION FAILED:');
    console.error(err && err.message ? err.message : err);

    const msg = String(err && err.message ? err.message : '');
    if (msg.includes('whitelist') || msg.includes('timeout')) {
      console.log("\n💡 Hint: Check Atlas 'Network Access' — is your current IP allowed?");
    } else if (msg.includes('authentication failed') || msg.includes('bad auth')) {
      console.log('\n💡 Hint: Verify username/password in MONGODB_URI.');
    } else if (msg.includes('ENOTFOUND') || msg.includes('DNS')) {
      console.log('\n💡 Hint: Ensure DNS/SRV records resolve (check your network).');
    }
    process.exit(1);
  } finally {
    try { await client.close(); } catch {}
  }
}

main();