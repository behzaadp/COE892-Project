import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';

const baseOptions = {
  versionKey: false,
  toJSON: {
    virtuals: true,
    transform: (_, ret) => {
      if (ret._id && !ret.id) {
        ret.id = ret._id;
      }
      delete ret._id;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (_, ret) => {
      if (ret._id && !ret.id) {
        ret.id = ret._id;
      }
      delete ret._id;
      return ret;
    }
  }
};

const LibraryItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    title: { type: String, required: true },
    author: { type: String, required: true },
    genre: { type: String, required: true },
    format: { type: String, required: true },
    status: { type: String, required: true, default: 'available' },
    description: { type: String, required: true },
    publishedDate: { type: String, required: true },
    location: { type: String, required: true },
    isbn: { type: String },
    coverImage: { type: String },
    pages: { type: Number },
    language: { type: String, required: true }
  },
  baseOptions
);

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    memberSince: { type: String, required: true },
    avatar: { type: String }
  },
  baseOptions
);

const BorrowedItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    itemId: { type: String, ref: 'LibraryItem', required: true },
    userId: { type: String, ref: 'User', required: true },
    borrowDate: { type: String, required: true },
    dueDate: { type: String, required: true },
    renewals: { type: Number, default: 0 }
  },
  baseOptions
);
BorrowedItemSchema.virtual('item', {
  ref: 'LibraryItem',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true
});
BorrowedItemSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

const ReadingListSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, ref: 'User', required: true },
    itemId: { type: String, ref: 'LibraryItem', required: true },
    addedAt: { type: Date, default: () => new Date() }
  },
  baseOptions
);
ReadingListSchema.index({ userId: 1, itemId: 1 }, { unique: true });
ReadingListSchema.virtual('item', {
  ref: 'LibraryItem',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true
});

const HoldSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, ref: 'User', required: true },
    itemId: { type: String, ref: 'LibraryItem', required: true },
    holdDate: { type: String, required: true }
  },
  baseOptions
);
HoldSchema.virtual('item', {
  ref: 'LibraryItem',
  localField: 'itemId',
  foreignField: '_id',
  justOne: true
});
HoldSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

const NotificationSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: () => new Date() }
  },
  baseOptions
);

export const LibraryItem = mongoose.model('LibraryItem', LibraryItemSchema);
export const User = mongoose.model('User', UserSchema);
export const BorrowedItem = mongoose.model('BorrowedItem', BorrowedItemSchema);
export const ReadingList = mongoose.model('ReadingList', ReadingListSchema);
export const Hold = mongoose.model('Hold', HoldSchema);
export const Notification = mongoose.model('Notification', NotificationSchema);
