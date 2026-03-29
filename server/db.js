import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { seedLibraryItems, seedUser, seedBorrowedItems } from './seedData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'library.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function initializeDatabase() {
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      memberSince TEXT NOT NULL,
      avatar TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS library_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      genre TEXT NOT NULL,
      format TEXT NOT NULL,
      status TEXT NOT NULL,
      description TEXT NOT NULL,
      publishedDate TEXT NOT NULL,
      location TEXT NOT NULL,
      isbn TEXT,
      coverImage TEXT,
      pages INTEGER,
      language TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS borrowed_items (
      id TEXT PRIMARY KEY,
      itemId TEXT NOT NULL,
      userId TEXT NOT NULL,
      borrowDate TEXT NOT NULL,
      dueDate TEXT NOT NULL,
      renewals INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (itemId) REFERENCES library_items(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS reading_list (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      addedAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (itemId) REFERENCES library_items(id) ON DELETE CASCADE,
      UNIQUE(userId, itemId)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS holds (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      holdDate TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (itemId) REFERENCES library_items(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);



  seedTables();
}

function seedTables() {
  // 1. Ensure Admin exists
  const adminCheck = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@publiclibrary.com');
  if (!adminCheck) {
    db.prepare(`
      INSERT INTO users (id, name, email, password, role, memberSince, avatar)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      'admin-1',
      'Library Admin',
      'admin@publiclibrary.com',
      'adminpass@01',
      'admin',
      new Date().toISOString().split('T')[0],
      'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff'
    );
  }

  // 2. Ensure Sample User exists
  const userCheck = db.prepare('SELECT id FROM users WHERE id = ?').get('u1');
  if (!userCheck) {
    db.prepare(`
      INSERT INTO users (id, name, email, password, role, memberSince, avatar)
      VALUES (@id, @name, @email, @password, @role, @memberSince, @avatar)
    `).run({ ...seedUser, password: 'password123', role: 'user' });
  }

  // 3. Seed Library Items
  const itemCount = db.prepare('SELECT COUNT(*) AS count FROM library_items').get().count;
  if (itemCount === 0) {
    const insertItem = db.prepare(`
      INSERT INTO library_items (id, title, author, genre, format, status, description, publishedDate, location, isbn, coverImage, pages, language)
      VALUES (@id, @title, @author, @genre, @format, @status, @description, @publishedDate, @location, @isbn, @coverImage, @pages, @language)
    `);
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insertItem.run({
          isbn: null,
          coverImage: null,
          pages: null,
          ...item
        });
      }
    });
    insertMany(seedLibraryItems);
  }

  // 4. Seed Borrowed Items
  const borrowedCount = db.prepare('SELECT COUNT(*) AS count FROM borrowed_items').get().count;
  if (borrowedCount === 0) {
    const insertBorrowed = db.prepare(`
      INSERT INTO borrowed_items (id, itemId, userId, borrowDate, dueDate, renewals)
      VALUES (@id, @itemId, @userId, @borrowDate, @dueDate, @renewals)
    `);
    const insertManyBorrowed = db.transaction((items) => {
      for (const item of items) {
        insertBorrowed.run(item);
      }
    });
    insertManyBorrowed(seedBorrowedItems);
  }
}