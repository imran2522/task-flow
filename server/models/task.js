import mongoose from 'mongoose';

const { Schema, Types } = mongoose;

const SubtaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    done: { type: Boolean, default: false },
    dueDate: { type: Date },
  },
  { _id: false }
);

const CommentSchema = new Schema(
  {
    author: { type: Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false }
);

const AttachmentSchema = new Schema(
  {
    filename: { type: String, trim: true },
    url: { type: String, trim: true },
    size: { type: Number },
    mimeType: { type: String },
  },
  { _id: false }
);

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 2 },
    description: { type: String, trim: true },

    status: {
      type: String,
      enum: ['todo', 'in_progress', 'blocked', 'done'],
      default: 'todo',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
      index: true,
    },

    assignee: { type: Types.ObjectId, ref: 'User', index: true },
    reporter: { type: Types.ObjectId, ref: 'User' },
    project: { type: Types.ObjectId, ref: 'Project', index: true },

    order: { type: Number, default: 0 },

    startDate: { type: Date },
    dueDate: { type: Date, index: true },
    completedAt: { type: Date },

    tags: {
      type: [String],
      set: (vals) => Array.isArray(vals) ? vals.map((t) => String(t).trim().toLowerCase()) : [],
      default: [],
      index: true,
    },

    subtasks: { type: [SubtaskSchema], default: [] },
    comments: { type: [CommentSchema], default: [] },
    attachments: { type: [AttachmentSchema], default: [] },

    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

TaskSchema.index({ project: 1, status: 1, priority: 1, dueDate: 1 });
TaskSchema.index({ title: 'text', description: 'text' });

TaskSchema.pre('save', function () {
  if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.isModified('status') && this.status !== 'done') {
    this.completedAt = undefined;
  }
});

TaskSchema.methods.start = function () {
  this.status = 'in_progress';
  if (!this.startDate) this.startDate = new Date();
  return this;
};

TaskSchema.methods.complete = function () {
  this.status = 'done';
  this.completedAt = new Date();
  return this;
};

export default mongoose.models.Task || mongoose.model('Task', TaskSchema);
