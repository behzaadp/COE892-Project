import express from 'express';
import cors from 'cors';
import { db, initializeDatabase } from './db.js';

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

    let query = 'SELECT * FROM library_items';
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    query += ' ORDER BY title ASC';

    const items = db.prepare(query).all(params);
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch library items', error);
    res.status(500).json({ message: 'Failed to fetch library items' });
  }
});

app.get(`${API_PREFIX}/library-items/:id`, (req, res) => {
  try {
    const item = db.prepare('SELECT * FROM library_items WHERE id = ?').get(req.params.id);
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
    const genres = db.prepare('SELECT DISTINCT genre FROM library_items ORDER BY genre ASC').all().map(row => row.genre);
    const formats = db.prepare('SELECT DISTINCT format FROM library_items ORDER BY format ASC').all().map(row => row.format);
    const availabilityOptions = db.prepare('SELECT DISTINCT status FROM library_items ORDER BY status ASC').all().map(row => row.status);

    res.json({
      genres: ['All Genres', ...genres],
      formats: ['All Formats', ...formats],
      availabilityOptions: ['All Status', ...availabilityOptions]
    });
  } catch (error) {
    console.error('Failed to fetch metadata', error);
    res.status(500).json({ message: 'Failed to fetch metadata' });
  }
});

app.get(`${API_PREFIX}/users/:id`, (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
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
    const rows = db.prepare(`
      SELECT bi.*, li.title, li.author, li.genre, li.format, li.status, li.description, li.publishedDate, li.location, li.isbn,
             li.coverImage, li.pages, li.language
      FROM borrowed_items bi
      JOIN library_items li ON li.id = bi.itemId
      WHERE bi.userId = @userId
      ORDER BY bi.dueDate ASC
    `).all({ userId: req.params.id });

    const borrowedItems = rows.map((row) => ({
      id: row.id,
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

    res.json(borrowedItems);
  } catch (error) {
    console.error('Failed to fetch borrowed items', error);
    res.status(500).json({ message: 'Failed to fetch borrowed items' });
  }
});

app.post(`${API_PREFIX}/borrowed/:id/renew`, (req, res) => {
  try {
    const borrowed = db.prepare('SELECT * FROM borrowed_items WHERE id = ?').get(req.params.id);
    if (!borrowed) {
      return res.status(404).json({ message: 'Borrowed item not found' });
    }

    const dueDate = new Date(`${borrowed.dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ message: 'Invalid due date stored for this record' });
    }

    if (dueDate < today) {
      return res.status(400).json({ message: 'Cannot renew overdue items. Please return in-branch.' });
    }

    if (borrowed.renewals >= 3) {
      return res.status(400).json({ message: 'Renewal limit reached for this item.' });
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

    res.json({
      id: row.id,
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
    });
  } catch (error) {
    console.error('Failed to renew borrowed item', error);
    res.status(500).json({ message: 'Failed to renew borrowed item' });
  }
});

app.listen(PORT, () => {
  console.log(`Library API running on http://localhost:${PORT}${API_PREFIX}`);
});
