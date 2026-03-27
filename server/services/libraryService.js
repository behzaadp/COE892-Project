import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

function buildFilters({ searchTerm = '', genre = '', format = '', availability = '' }) {
  const conditions = [];
  const params = {};

  if (searchTerm) {
    conditions.push('(LOWER(title) LIKE @search OR LOWER(author) LIKE @search OR LOWER(genre) LIKE @search)');
    params.search = `%${String(searchTerm).toLowerCase()}%`;
  }

  if (genre) {
    conditions.push('genre = @genre');
    params.genre = genre;
  }

  if (format) {
    conditions.push('format = @format');
    params.format = format;
  }

  if (availability) {
    conditions.push('status = @status');
    params.status = availability;
  }

  return { conditions, params };
}

export function listLibraryItems(filters = {}) {
  const { conditions, params } = buildFilters(filters);
  let query = 'SELECT * FROM library_items';
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY title ASC';
  return db.prepare(query).all(params);
}

export function getLibraryItemById(id) {
  return db.prepare('SELECT * FROM library_items WHERE id = ?').get(id);
}

export function getMetadata() {
  const genres = db.prepare('SELECT DISTINCT genre FROM library_items ORDER BY genre ASC').all().map(row => row.genre);
  const formats = db.prepare('SELECT DISTINCT format FROM library_items ORDER BY format ASC').all().map(row => row.format);
  const availabilityOptions = db.prepare('SELECT DISTINCT status FROM library_items ORDER BY status ASC').all().map(row => row.status);

  return {
    genres: ['All Genres', ...genres],
    formats: ['All Formats', ...formats],
    availabilityOptions: ['All Status', ...availabilityOptions]
  };
}

export function getUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function getBorrowedItemsByUser(userId) {
  const rows = db.prepare(`
      SELECT bi.*, li.title, li.author, li.genre, li.format, li.status, li.description, li.publishedDate, li.location, li.isbn,
             li.coverImage, li.pages, li.language
      FROM borrowed_items bi
      JOIN library_items li ON li.id = bi.itemId
      WHERE bi.userId = @userId
      ORDER BY bi.dueDate ASC
    `).all({ userId });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    borrowDate: row.borrowDate,
    dueDate: row.dueDate,
    renewals: row.renewals,
    item: {
      id: row.itemId,
      title: row.title,
      author: row.author,
      genre: row.genre,
      format: row.format,
      status: row.status,
      description: row.description,
      publishedDate: row.publishedDate,
      location: row.location,
      isbn: row.isbn,
      coverImage: row.coverImage,
      pages: row.pages,
      language: row.language
    }
  }));
}

export function renewBorrowedItem(borrowedId) {
  const borrowed = db.prepare('SELECT * FROM borrowed_items WHERE id = ?').get(borrowedId);
  if (!borrowed) {
    const error = new Error('Borrowed item not found');
    error.statusCode = 404;
    throw error;
  }

  const dueDate = new Date(`${borrowed.dueDate}T00:00:00`);
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
  const updatedRecord = {
    dueDate: dueDate.toISOString().split('T')[0],
    renewals: borrowed.renewals + 1,
    id: borrowed.id
  };

  db.prepare('UPDATE borrowed_items SET dueDate = @dueDate, renewals = @renewals WHERE id = @id').run(updatedRecord);

  const row = db.prepare(`
      SELECT bi.*, li.title, li.author, li.genre, li.format, li.status, li.description, li.publishedDate, li.location, li.isbn,
             li.coverImage, li.pages, li.language
      FROM borrowed_items bi
      JOIN library_items li ON li.id = bi.itemId
      WHERE bi.id = @id
    `).get({ id: borrowed.id });

  return {
    id: row.id,
    userId: row.userId,
    borrowDate: row.borrowDate,
    dueDate: row.dueDate,
    renewals: row.renewals,
    item: {
      id: row.itemId,
      title: row.title,
      author: row.author,
      genre: row.genre,
      format: row.format,
      status: row.status,
      description: row.description,
      publishedDate: row.publishedDate,
      location: row.location,
      isbn: row.isbn,
      coverImage: row.coverImage,
      pages: row.pages,
      language: row.language
    }
  };
}

export function borrowItem(userId, itemId) {
  const item = db.prepare('SELECT * FROM library_items WHERE id = ?').get(itemId);
  if (!item || item.status !== 'available') throw new Error('Item is not available to borrow.');

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14); // 14-day checkout limit

  const borrowId = randomUUID();

  // Use a transaction so both the item status and borrow record update together
  db.transaction(() => {
    db.prepare("UPDATE library_items SET status = 'checked-out' WHERE id = ?").run(itemId);
    db.prepare(`
      INSERT INTO borrowed_items (id, itemId, userId, borrowDate, dueDate, renewals)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(borrowId, itemId, userId, borrowDate.toISOString().split('T')[0], dueDate.toISOString().split('T')[0]);
  })();

  return { success: true };
}

export function addToReadingList(userId, itemId) {
  try {
    db.prepare(`
      INSERT INTO reading_list (id, userId, itemId, addedAt)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), userId, itemId, new Date().toISOString());
    return { success: true };
  } catch(e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return { success: true, message: 'Already in list' };
    throw e;
  }
}

export function getReadingListByUser(userId) {
  return db.prepare(`
    SELECT rl.id as listId, rl.addedAt, li.*
    FROM reading_list rl
    JOIN library_items li ON li.id = rl.itemId
    WHERE rl.userId = ?
    ORDER BY rl.addedAt DESC
  `).all(userId);
}

export function removeFromReadingList(userId, itemId) {
  db.prepare('DELETE FROM reading_list WHERE userId = ? AND itemId = ?').run(userId, itemId);
  return { success: true };
}

export function getAllBorrowedItems() {
  const rows = db.prepare(`
    SELECT bi.*, 
           u.name as userName, u.email as userEmail,
           li.title, li.author, li.coverImage
    FROM borrowed_items bi
    JOIN users u ON u.id = bi.userId
    JOIN library_items li ON li.id = bi.itemId
    ORDER BY bi.borrowDate ASC
  `).all();

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    borrowDate: row.borrowDate,
    dueDate: row.dueDate,
    renewals: row.renewals,
    user: { name: row.userName, email: row.userEmail },
    item: { id: row.itemId, title: row.title, author: row.author, coverImage: row.coverImage }
  }));
}

export function returnItem(borrowedId) {
  const borrowed = db.prepare('SELECT * FROM borrowed_items WHERE id = ?').get(borrowedId);
  if (!borrowed) throw new Error('Borrowed item not found');

  db.transaction(() => {
    // Make book available again
    db.prepare("UPDATE library_items SET status = 'available' WHERE id = ?").run(borrowed.itemId);
    // Remove from borrowed list
    db.prepare("DELETE FROM borrowed_items WHERE id = ?").run(borrowedId);
  })();

  return { success: true };
}

export function placeHold(itemId, userEmail) {
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(userEmail);
  if (!user) throw new Error('User not found with that email.');

  const item = db.prepare('SELECT status FROM library_items WHERE id = ?').get(itemId);
  if (!item || item.status !== 'available') throw new Error('Item is not available to hold.');

  const holdId = randomUUID();
  db.transaction(() => {
    db.prepare("UPDATE library_items SET status = 'on-hold' WHERE id = ?").run(itemId);
    db.prepare("INSERT INTO holds (id, userId, itemId, holdDate) VALUES (?, ?, ?, ?)").run(holdId, user.id, itemId, new Date().toISOString());
  })();

  return { success: true };
}

export function removeHold(holdId) {
  const hold = db.prepare('SELECT itemId FROM holds WHERE id = ?').get(holdId);
  if (!hold) throw new Error('Hold record not found');

  db.transaction(() => {
    db.prepare("UPDATE library_items SET status = 'available' WHERE id = ?").run(hold.itemId);
    db.prepare("DELETE FROM holds WHERE id = ?").run(holdId);
  })();
  return { success: true };
}

export function getHoldsByUser(userId) {
  const rows = db.prepare(`
    SELECT h.id as holdId, h.holdDate, li.id, li.title, li.author, li.coverImage, li.status
    FROM holds h
    JOIN library_items li ON li.id = h.itemId
    WHERE h.userId = ?
    ORDER BY h.holdDate DESC
  `).all(userId);

  return rows.map(row => ({
    id: row.holdId, holdDate: row.holdDate,
    item: { id: row.id, title: row.title, author: row.author, coverImage: row.coverImage, status: row.status }
  }));
}

export function getAllHolds() {
  const rows = db.prepare(`
    SELECT h.id as holdId, h.holdDate, u.name as userName, u.email as userEmail, li.id, li.title, li.author, li.coverImage
    FROM holds h
    JOIN users u ON u.id = h.userId
    JOIN library_items li ON li.id = h.itemId
    ORDER BY h.holdDate DESC
  `).all();

  return rows.map(row => ({
    id: row.holdId, holdDate: row.holdDate,
    user: { name: row.userName, email: row.userEmail },
    item: { id: row.id, title: row.title, author: row.author, coverImage: row.coverImage }
  }));
}