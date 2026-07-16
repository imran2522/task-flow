import mongoose from 'mongoose';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(2);
}

(async () => {
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('OK: connected to MongoDB');
    await mongoose.disconnect();
    process.exit(0);
  } catch (e) {
    console.error('ERR', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();
