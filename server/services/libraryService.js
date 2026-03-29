import { randomUUID } from 'node:crypto';
import { BorrowedItem, Hold, LibraryItem, ReadingList, User } from '../models/index.js';

function buildQuery({ searchTerm = '', genre = '', format = '', availability = '' }) {
  const query = {};
  if (searchTerm) {
    const regex = new RegExp(searchTerm, 'i');
    query.$or = [{ title: regex }, { author: regex }, { genre: regex }];
  }
  if (genre) {
    query.genre = genre;
  }
  if (format) {
    query.format = format;
  }
  if (availability) {
    query.status = availability;
  }
  return query;
}

function docToPlain(doc) {
  if (!doc) return null;
  if (typeof doc.toObject === 'function') {
    const obj = doc.toObject({ virtuals: true });
    if (obj._id && !obj.id) {
      obj.id = obj._id;
    }
    delete obj._id;
    delete obj.__v;
    return obj;
  }
  if (doc._id && !doc.id) {
    const { _id, __v, ...rest } = doc;
    return { ...rest, id: doc._id };
  }
  return doc;
}

function mapLibraryItem(doc) {
  if (typeof doc === 'string') {
    return { id: doc };
  }
  const plain = docToPlain(doc);
  if (!plain) return null;
  return plain;
}

function mapBorrowedRecord(doc) {
  const plain = docToPlain(doc);
  if (!plain) return null;
  return {
    id: plain.id,
    userId: plain.userId,
    borrowDate: plain.borrowDate,
    dueDate: plain.dueDate,
    renewals: plain.renewals,
    item: mapLibraryItem(doc?.item || doc?.itemId || plain.item)
  };
}

export async function listLibraryItems(filters = {}) {
  const query = buildQuery(filters);
  const items = await LibraryItem.find(query).sort({ title: 1 }).exec();
  return items.map(mapLibraryItem);
}

export async function getLibraryItemById(id) {
  const item = await LibraryItem.findById(id).exec();
  return mapLibraryItem(item);
}

export async function getMetadata() {
  const [genres, formats, availabilityOptions] = await Promise.all([
    LibraryItem.distinct('genre'),
    LibraryItem.distinct('format'),
    LibraryItem.distinct('status')
  ]);

  return {
    genres: ['All Genres', ...genres.sort()],
    formats: ['All Formats', ...formats.sort()],
    availabilityOptions: ['All Status', ...availabilityOptions.sort()]
  };
}

export async function getUserById(id) {
  const user = await User.findById(id).exec();
  if (!user) return null;
  const plain = docToPlain(user);
  delete plain.password;
  return plain;
}

export async function getBorrowedItemsByUser(userId) {
  const records = await BorrowedItem.find({ userId }).sort({ dueDate: 1 }).populate('item').exec();
  return records.map(mapBorrowedRecord);
}

export async function renewBorrowedItem(borrowedId) {
  const borrowed = await BorrowedItem.findById(borrowedId).exec();
  if (!borrowed) {
    const error = new Error('Borrowed item not found');
    error.statusCode = 404;
    throw error;
  }

  const dueDate = new Date(`${borrowed.dueDate}T00:00:00Z`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (Number.isNaN(dueDate.getTime())) {
    const error = new Error('Invalid due date stored for this record');
    error.statusCode = 400;
    throw error;
  }

  if (dueDate < today) {
    const error = new Error('Cannot renew overdue items. Please return in-branch.');
    error.statusCode = 400;
    throw error;
  }

  if (borrowed.renewals >= 3) {
    const error = new Error('Renewal limit reached for this item.');
    error.statusCode = 400;
    throw error;
  }

  dueDate.setDate(dueDate.getDate() + 14);
  borrowed.dueDate = dueDate.toISOString().split('T')[0];
  borrowed.renewals += 1;
  await borrowed.save();
  await borrowed.populate('item');
  return mapBorrowedRecord(borrowed);
}

export async function borrowItem(userId, itemId) {
  const item = await LibraryItem.findById(itemId).exec();
  if (!item || item.status !== 'available') throw new Error('Item is not available to borrow.');

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  item.status = 'checked-out';
  await item.save();

  const borrowed = await BorrowedItem.create({
    itemId,
    userId,
    borrowDate: borrowDate.toISOString().split('T')[0],
    dueDate: dueDate.toISOString().split('T')[0],
    renewals: 0
  });

  return mapBorrowedRecord(await borrowed.populate('item'));
}

export async function addToReadingList(userId, itemId) {
  try {
    await ReadingList.findOneAndUpdate(
      { userId, itemId },
      { $setOnInsert: { addedAt: new Date(), _id: randomUUID() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { success: true };
  } catch (error) {
    if (error.code === 11000) {
      return { success: true, message: 'Already in list' };
    }
    throw error;
  }
}

export async function getReadingListByUser(userId) {
  const entries = await ReadingList.find({ userId }).sort({ addedAt: -1 }).populate('item').exec();
  return entries.map((entry) => {
    const item = mapLibraryItem(entry.item);
    return {
      ...(item || {}),
      listId: entry.id,
      addedAt: entry.addedAt instanceof Date ? entry.addedAt.toISOString() : entry.addedAt
    };
  });
}

export async function removeFromReadingList(userId, itemId) {
  await ReadingList.deleteOne({ userId, itemId }).exec();
  return { success: true };
}

export async function getAllBorrowedItems() {
  const records = await BorrowedItem.find().sort({ borrowDate: 1 }).populate('item').populate('user').exec();
  return records.map((record) => {
    const plain = docToPlain(record);
    return {
      id: plain.id,
      userId: plain.userId,
      borrowDate: plain.borrowDate,
      dueDate: plain.dueDate,
      renewals: plain.renewals,
      user: {
        name: record.user?.name ?? '',
        email: record.user?.email ?? ''
      },
      item: {
        id: record.item?.id ?? plain.itemId,
        title: record.item?.title ?? '',
        author: record.item?.author ?? '',
        coverImage: record.item?.coverImage
      }
    };
  });
}

export async function returnItem(borrowedId) {
  const borrowed = await BorrowedItem.findById(borrowedId).exec();
  if (!borrowed) throw new Error('Borrowed item not found');

  await BorrowedItem.deleteOne({ _id: borrowedId }).exec();
  await LibraryItem.updateOne({ _id: borrowed.itemId }, { status: 'available' }).exec();
  return { success: true };
}

export async function placeHold(itemId, userEmail) {
  const user = await User.findOne({ email: userEmail }).exec();
  if (!user) throw new Error('User not found with that email.');

  const item = await LibraryItem.findById(itemId).exec();
  if (!item || item.status !== 'available') throw new Error('Item is not available to hold.');

  item.status = 'on-hold';
  await item.save();

  await Hold.create({
    userId: user.id,
    itemId,
    holdDate: new Date().toISOString()
  });

  return { success: true };
}

export async function removeHold(holdId) {
  const hold = await Hold.findById(holdId).exec();
  if (!hold) throw new Error('Hold record not found');

  await Hold.deleteOne({ _id: holdId }).exec();
  await LibraryItem.updateOne({ _id: hold.itemId }, { status: 'available' }).exec();
  return { success: true };
}

export async function getHoldsByUser(userId) {
  const holds = await Hold.find({ userId }).sort({ holdDate: -1 }).populate('item').exec();
  return holds.map((hold) => ({
    id: hold.id,
    holdDate: hold.holdDate,
    item: mapLibraryItem(hold.item)
  }));
}

export async function getAllHolds() {
  const holds = await Hold.find().sort({ holdDate: -1 }).populate('item').populate('user').exec();
  return holds.map((hold) => ({
    id: hold.id,
    holdDate: hold.holdDate,
    item: mapLibraryItem(hold.item),
    user: {
      name: hold.user?.name ?? '',
      email: hold.user?.email ?? ''
    }
  }));
}
