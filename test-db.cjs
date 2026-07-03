const fs = require('fs');
const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

function configureDns() {
  const fromEnv = process.env.DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (fromEnv?.length) {
    dns.setServers(fromEnv);
    return;
  }
  const current = dns.getServers();
  const localOnly = current.length === 0
    || current.every((s) => s.startsWith('127.') || s.startsWith('fe80:') || s === '::1');
  if (localOnly) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
}

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

configureDns();

console.log('--- Connection Test ---');
console.log('Loaded env: ' + (loadedEnvPath ? loadedEnvPath : 'none (process env only)'));

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ Error: MONGODB_URI is not defined in your env file!');
  process.exit(1);
}

console.log('Attempting to connect to Atlas...');

(async () => {
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
    } else if (msg.includes('querySrv ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('DNS')) {
      console.log('\n💡 Hint: Local DNS may block SRV lookups. Set DNS_SERVERS=8.8.8.8,1.1.1.1 in .env.local or fix your DNS resolver.');
    }
    process.exit(1);
  } finally {
    try { await client.close(); } catch {}
  }
})();
