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
  removeFromReadingList,
  getAllBorrowedItems,
  returnItem,
  placeHold,
  removeHold,
  getHoldsByUser,
  getAllHolds
} from './services/libraryService.js';
import { startGrpcServer } from './grpcServer.js';
import { initializeMessaging, publishHoldRequest, publishNotificationEvent } from './messaging/rabbitmq.js';
import { randomUUID } from 'node:crypto';
import { startNotificationConsumer } from './messaging/notificationConsumer.js';
import { startScheduler } from './scheduler.js';
import { Notification, User } from './models/index.js';

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

app.get(`${API_PREFIX}/library-items`, async (req, res) => {
  try {
    const searchTerm = normalizeQueryValue(req.query.searchTerm ?? '');
    const genre = normalizeQueryValue(req.query.genre ?? '');
    const format = normalizeQueryValue(req.query.format ?? '');
    const availability = normalizeQueryValue(req.query.availability ?? '');
    const items = await listLibraryItems({ searchTerm, genre, format, availability });
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch library items', error);
    res.status(500).json({ message: 'Failed to fetch library items' });
  }
});

app.get(`${API_PREFIX}/library-items/:id`, async (req, res) => {
  try {
    const item = await getLibraryItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    console.error('Failed to fetch library item', error);
    res.status(500).json({ message: 'Failed to fetch library item' });
  }
});

app.get(`${API_PREFIX}/metadata`, async (_req, res) => {
  try {
    res.json(await getMetadata());
  } catch (error) {
    console.error('Failed to fetch metadata', error);
    res.status(500).json({ message: 'Failed to fetch metadata' });
  }
});

app.get(`${API_PREFIX}/users/:id`, async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Failed to fetch user', error);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

app.get(`${API_PREFIX}/users/:id/borrowed-items`, async (req, res) => {
  try {
    const borrowedItems = await getBorrowedItemsByUser(req.params.id);
    res.json(borrowedItems);
  } catch (error) {
    console.error('Failed to fetch borrowed items', error);
    res.status(500).json({ message: 'Failed to fetch borrowed items' });
  }
});

app.post(`${API_PREFIX}/borrowed/:id/renew`, async (req, res) => {
  try {
    const record = await renewBorrowedItem(req.params.id);
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
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const item = await getLibraryItemById(req.params.id);
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

app.post(`${API_PREFIX}/users/signup`, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const id = randomUUID();
    const memberSince = new Date().toISOString().split('T')[0];
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const user = await User.create({ _id: id, name, email, password, memberSince, avatar, role: 'user' });
    const plain = user.toObject();
    delete plain.password;
    res.status(201).json({ ...plain, id });
  } catch (error) {
    console.error('Failed to sign up user', error);
    res.status(500).json({ message: 'Failed to sign up user' });
  }
});

app.post(`${API_PREFIX}/users/login`, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email, password }, 'name email role memberSince avatar').lean();

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const id = user._id?.toString() ?? user.id;
    const { _id, ...rest } = user;
    res.json({ ...rest, id });
  } catch (error) {
    console.error('Failed to log in', error);
    res.status(500).json({ message: 'Failed to log in' });
  }
});

app.post(`${API_PREFIX}/library-items/:id/borrow`, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'User ID required' });
    await borrowItem(userId, req.params.id);
    res.json({ message: 'Item borrowed successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to borrow item' });
  }
});

app.get(`${API_PREFIX}/users/:id/reading-list`, async (req, res) => {
  try { res.json(await getReadingListByUser(req.params.id)); }
  catch (error) { res.status(500).json({ message: 'Failed to fetch reading list' }); }
});

app.post(`${API_PREFIX}/users/:id/reading-list`, async (req, res) => {
  try {
    const { itemId } = req.body;
    await addToReadingList(req.params.id, itemId);
    res.json({ message: 'Added to reading list' });
  } catch (error) { res.status(500).json({ message: 'Failed to add to reading list' }); }
});

app.delete(`${API_PREFIX}/users/:userId/reading-list/:itemId`, async (req, res) => {
  try {
    await removeFromReadingList(req.params.userId, req.params.itemId);
    res.json({ message: 'Removed from reading list' });
  } catch (error) { res.status(500).json({ message: 'Failed to remove from reading list' }); }
});

app.get(`${API_PREFIX}/admin/borrowed-items`, async (_req, res) => {
  try { res.json(await getAllBorrowedItems()); }
  catch (error) { res.status(500).json({ message: 'Failed to fetch all borrowed items' }); }
});

app.post(`${API_PREFIX}/admin/return/:borrowedId`, async (req, res) => {
  try {
    await returnItem(req.params.borrowedId);
    res.json({ message: 'Item returned successfully' });
  } catch (error) { res.status(500).json({ message: error.message || 'Failed to return item' }); }
});

app.post(`${API_PREFIX}/admin/holds`, async (req, res) => {
  try {
    const { itemId, userEmail } = req.body;
    await placeHold(itemId, userEmail);
    res.json({ message: 'Hold placed successfully' });
  } catch (error) { res.status(400).json({ message: error.message }); }
});

app.delete(`${API_PREFIX}/admin/holds/:id`, async (req, res) => {
  try {
    await removeHold(req.params.id);
    res.json({ message: 'Hold removed' });
  } catch (error) { res.status(500).json({ message: 'Failed to remove hold' }); }
});

app.get(`${API_PREFIX}/users/:id/holds`, async (req, res) => {
  try { res.json(await getHoldsByUser(req.params.id)); }
  catch (error) { res.status(500).json({ message: 'Failed to fetch user holds' }); }
});

app.get(`${API_PREFIX}/admin/holds`, async (_req, res) => {
  try { res.json(await getAllHolds()); }
  catch (error) { res.status(500).json({ message: 'Failed to fetch all holds' }); }
});

app.get(`${API_PREFIX}/notifications/:userId`, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json(notifications.map((n) => ({
      id: n._id?.toString() ?? n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      read: Boolean(n.read),
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt
    })));
  } catch (error) {
    console.error('Failed to fetch notifications', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

app.patch(`${API_PREFIX}/notifications/:id/read`, async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id }, { read: true }).exec();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

app.patch(`${API_PREFIX}/notifications/user/:userId/read-all`, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId }, { read: true }).exec();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

app.delete(`${API_PREFIX}/notifications/:id`, async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id }).exec();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete notification' });
  }
});

async function bootstrap() {
  await initializeDatabase();

  initializeMessaging().then((channel) => {
    if (channel) {
      const notificationsQueue = process.env.RABBITMQ_NOTIFICATIONS_QUEUE || 'library.notifications';
      const holdsQueue = process.env.RABBITMQ_HOLDS_QUEUE || 'library.holds';
      startNotificationConsumer(channel, notificationsQueue, holdsQueue);
    }
  }).catch((error) => {
    console.error('Failed to initialize RabbitMQ', error);
  });

  startGrpcServer();
  startScheduler();

  app.listen(PORT, () => {
    console.log(`Library API running on http://localhost:${PORT}${API_PREFIX}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application', error);
  process.exit(1);
});
