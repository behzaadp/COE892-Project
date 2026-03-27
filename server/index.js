import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db.js';
import {
  listLibraryItems,
  getLibraryItemById,
  getMetadata,
  getUserById,
  getBorrowedItemsByUser,
  renewBorrowedItem,
  borrowItem,
  addToReadingList,
  getReadingListByUser,
  removeFromReadingList
} from './services/libraryService.js';
import { startGrpcServer } from './grpcServer.js';
import { initializeMessaging, publishHoldRequest, publishNotificationEvent } from './messaging/rabbitmq.js';
import { randomUUID } from 'node:crypto';
import { db } from './db.js';

initializeDatabase();

const app = express();
const PORT = process.env.PORT || 4000;
const API_PREFIX = '/api';

app.use(cors());
app.use(express.json());

const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '';
};

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ status: 'ok' });
});

app.get(`${API_PREFIX}/library-items`, (req, res) => {
  try {
    const searchTerm = normalizeQueryValue(req.query.searchTerm ?? '');
    const genre = normalizeQueryValue(req.query.genre ?? '');
    const format = normalizeQueryValue(req.query.format ?? '');
    const availability = normalizeQueryValue(req.query.availability ?? '');
    const items = listLibraryItems({ searchTerm, genre, format, availability });
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch library items', error);
    res.status(500).json({ message: 'Failed to fetch library items' });
  }
});

app.get(`${API_PREFIX}/library-items/:id`, (req, res) => {
  try {
    const item = getLibraryItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Failed to fetch library item', error);
    res.status(500).json({ message: 'Failed to fetch library item' });
  }
});

app.get(`${API_PREFIX}/metadata`, (_req, res) => {
  try {
    res.json(getMetadata());
  } catch (error) {
    console.error('Failed to fetch metadata', error);
    res.status(500).json({ message: 'Failed to fetch metadata' });
  }
});

app.get(`${API_PREFIX}/users/:id`, (req, res) => {
  try {
    const user = getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to fetch user', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

app.get(`${API_PREFIX}/users/:id/borrowed-items`, (req, res) => {
  try {
    const borrowedItems = getBorrowedItemsByUser(req.params.id);
    res.json(borrowedItems);
  } catch (error) {
    console.error('Failed to fetch borrowed items', error);
    res.status(500).json({ message: 'Failed to fetch borrowed items' });
  }
});

app.post(`${API_PREFIX}/borrowed/:id/renew`, (req, res) => {
  try {
    const record = renewBorrowedItem(req.params.id);
    publishNotificationEvent({
      type: 'BORROWED_RENEWED',
      borrowedId: record.id,
      userId: record.userId,
      itemId: record.item?.id,
      dueDate: record.dueDate,
      renewals: record.renewals,
      source: 'http',
      timestamp: new Date().toISOString()
    }).catch((error) => console.error('Failed to enqueue renewal notification', error));
    res.json(record);
  } catch (error) {
    console.error('Failed to renew borrowed item', error);
    const status = error.statusCode ?? 500;
    res.status(status).json({ message: error.message ?? 'Failed to renew borrowed item' });
  }
});

app.post(`${API_PREFIX}/library-items/:id/hold`, async (req, res) => {
  try {
    const { userId, contact } = req.body ?? {};
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }
    const user = getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const item = getLibraryItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Library item not found' });
    }

    await publishHoldRequest({
      type: 'HOLD_REQUESTED',
      userId,
      itemId: item.id,
      itemTitle: item.title,
      contact,
      requestedAt: new Date().toISOString()
    });

    res.status(202).json({ message: 'Hold request queued for processing' });
  } catch (error) {
    console.error('Failed to enqueue hold request', error);
    res.status(500).json({ message: 'Failed to enqueue hold request' });
  }
});

app.post(`${API_PREFIX}/users/signup`, (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const id = randomUUID();
    const memberSince = new Date().toISOString().split('T')[0];
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    db.prepare(`
      INSERT INTO users (id, name, email, password, memberSince, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, email, password, memberSince, avatar);

    res.status(201).json({ id, name, email, memberSince, avatar });
  } catch (error) {
    console.error('Failed to sign up user', error);
    res.status(500).json({ message: 'Failed to sign up user' });
  }
});

app.post(`${API_PREFIX}/users/login`, (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check credentials against the database
    const user = db.prepare(`
      SELECT id, name, email, memberSince, avatar 
      FROM users 
      WHERE email = ? AND password = ?
    `).get(email, password);

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json(user);
  } catch (error) {
    console.error('Failed to log in', error);
    res.status(500).json({ message: 'Failed to log in' });
  }
});

app.post(`${API_PREFIX}/library-items/:id/borrow`, (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required' });
    borrowItem(userId, req.params.id);
    res.json({ message: 'Item borrowed successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to borrow item' });
  }
});

app.get(`${API_PREFIX}/users/:id/reading-list`, (req, res) => {
  try { res.json(getReadingListByUser(req.params.id)); } 
  catch (error) { res.status(500).json({ message: 'Failed to fetch reading list' }); }
});

app.post(`${API_PREFIX}/users/:id/reading-list`, (req, res) => {
  try {
    const { itemId } = req.body;
    addToReadingList(req.params.id, itemId);
    res.json({ message: 'Added to reading list' });
  } catch (error) { res.status(500).json({ message: 'Failed to add to reading list' }); }
});

app.delete(`${API_PREFIX}/users/:userId/reading-list/:itemId`, (req, res) => {
  try {
    removeFromReadingList(req.params.userId, req.params.itemId);
    res.json({ message: 'Removed from reading list' });
  } catch (error) { res.status(500).json({ message: 'Failed to remove from reading list' }); }
});

initializeMessaging().catch((error) => {
  console.error('Failed to initialize RabbitMQ', error);
});

startGrpcServer();

app.listen(PORT, () => {
  console.log(`Library API running on http://localhost:${PORT}${API_PREFIX}`);
});
