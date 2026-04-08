import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const candidateEnvFiles = ['.env.local', '.env'];
for (const p of candidateEnvFiles) {
  const full = path.resolve(process.cwd(), p);
  if (fs.existsSync(full)) {
    dotenv.config({ path: full });
    break;
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI is not defined in env');
}

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set('strictQuery', false);
  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
  });
}
