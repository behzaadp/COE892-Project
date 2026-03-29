import mongoose from 'mongoose';
import { seedLibraryItems, seedUser, seedBorrowedItems } from './seedData.js';
import { LibraryItem, User, BorrowedItem } from './models/index.js';

const DEFAULT_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library';
const DEFAULT_DB = process.env.MONGODB_DB || 'library';

export async function initializeDatabase() {
  mongoose.set('strictQuery', true);
  const connection = await mongoose.connect(DEFAULT_URI, { dbName: DEFAULT_DB });
  console.log(`[MongoDB] Connected to ${connection.connection.name}`);
  await seedDatabase();
  return connection;
}

async function seedDatabase() {
  const adminProfile = {
    _id: 'admin-1',
    name: 'Library Admin',
    email: 'admin@publiclibrary.com',
    password: 'adminpass@01',
    role: 'admin',
    memberSince: new Date().toISOString().split('T')[0],
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
  };

  await User.findOneAndUpdate({ _id: adminProfile._id }, adminProfile, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });

  await User.findOneAndUpdate({ _id: seedUser.id }, {
    _id: seedUser.id,
    name: seedUser.name,
    email: seedUser.email,
    password: seedUser.password,
    role: 'user',
    memberSince: seedUser.memberSince,
    avatar: seedUser.avatar
  }, { upsert: true, new: true, setDefaultsOnInsert: true });

  const itemCount = await LibraryItem.estimatedDocumentCount();
  if (itemCount === 0) {
    await LibraryItem.insertMany(
      seedLibraryItems.map((item) => ({
        _id: item.id,
        title: item.title,
        author: item.author,
        genre: item.genre,
        format: item.format,
        status: item.status,
        description: item.description,
        publishedDate: item.publishedDate,
        location: item.location,
        isbn: item.isbn,
        coverImage: item.coverImage,
        pages: item.pages,
        language: item.language
      }))
    );
    console.log('[MongoDB] Seeded library items');
  }

  const borrowedCount = await BorrowedItem.estimatedDocumentCount();
  if (borrowedCount === 0) {
    await BorrowedItem.insertMany(
      seedBorrowedItems.map((record) => ({
        _id: record.id,
        itemId: record.itemId,
        userId: record.userId,
        borrowDate: record.borrowDate,
        dueDate: record.dueDate,
        renewals: record.renewals
      }))
    );
    console.log('[MongoDB] Seeded borrowed items');
  }
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
