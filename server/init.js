import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { configureDns } from './dns.js';

const candidateEnvFiles = ['.env.local', '.env'];
for (const p of candidateEnvFiles) {
  const full = path.resolve(process.cwd(), p);
  if (fs.existsSync(full)) {
    dotenv.config({ path: full });
    break;
  }
}

configureDns();
