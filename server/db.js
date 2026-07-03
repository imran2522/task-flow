import './init.js';
import mongoose from 'mongoose';

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
