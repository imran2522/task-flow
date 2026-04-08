import mongoose from 'mongoose';

const { Schema } = mongoose;

const NotificationSettingsSchema = new Schema(
  {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: false },
    desktop: { type: Boolean, default: false },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    settings: { type: NotificationSettingsSchema, default: () => ({}) },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
