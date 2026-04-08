import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, uppercase: true, trim: true, unique: true },
    description: { type: String },
    owner: { type: Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Types.ObjectId, ref: 'User' }],
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProjectSchema.index({ key: 1 }, { unique: true });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
