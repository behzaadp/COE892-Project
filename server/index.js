import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './db.js';
import {
  listLibraryItems,
  getLibraryItemById,
  getMetadata,
  getUserById,
  getBorrowedItemsByUser,
  renewBorrowedItem
} from './services/libraryService.js';
import { startGrpcServer } from './grpcServer.js';
import { initializeMessaging, publishHoldRequest, publishNotificationEvent } from './messaging/rabbitmq.js';

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

initializeMessaging().catch((error) => {
  console.error('Failed to initialize RabbitMQ', error);
});

startGrpcServer();

app.listen(PORT, () => {
  console.log(`Library API running on http://localhost:${PORT}${API_PREFIX}`);
});
