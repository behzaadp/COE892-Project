// server/scheduler.js
import { db } from './db.js';
import { randomUUID } from 'node:crypto';

function saveNotification({ userId, type, title, message, itemTitle }) {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Deduplicate per user + type + item title + day
        const existing = db.prepare(`
      SELECT id FROM notifications 
      WHERE userId = ? AND type = ? AND message LIKE ? AND createdAt LIKE ?
    `).get(userId, type, `%${itemTitle}%`, `${today}%`);

        if (existing) return;

        db.prepare(`
      INSERT INTO notifications (id, userId, type, title, message, read, createdAt)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(randomUUID(), userId, type, title, message, new Date().toISOString());

        console.log(`[Scheduler] Saved: ${type} for user ${userId}`);
    } catch (err) {
        console.error('[Scheduler] Failed to save notification', err);
    }
}

function checkDueDates() {
    console.log('[Scheduler] Running due date check...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = today.toISOString().split('T')[0];

    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 2);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const rows = db.prepare(`
    SELECT bi.id, bi.userId, bi.dueDate, li.title
    FROM borrowed_items bi
    JOIN library_items li ON li.id = bi.itemId
  `).all();

    for (const row of rows) {
        const { userId, dueDate, title } = row;

        // Due today
        if (dueDate === todayStr) {
            saveNotification({
                userId,
                type: 'DUE_TODAY',
                title: 'Item Due Today',
                message: `"${title}" is due back today. Please return or renew it.`,
                itemTitle: title,
            });
        }

        // Due in 3 days
        if (dueDate === in3DaysStr) {
            saveNotification({
                userId,
                type: 'DUE_SOON',
                title: 'Item Due Soon',
                message: `"${title}" is due in 3 days (${dueDate}). Consider renewing it.`,
                itemTitle: title,
            });
        }

        // Overdue (due date was yesterday or earlier)
        if (dueDate <= yesterdayStr) {
            saveNotification({
                userId,
                type: 'OVERDUE',
                title: 'Item Overdue',
                message: `"${title}" was due on ${dueDate} and is now overdue. Please return it.`,
                itemTitle: title,
            });
        }
    }
}

export function startScheduler() {
    // Run once immediately on startup
    checkDueDates();

    // Then run every hour
    setInterval(checkDueDates, 60 * 60 * 1000);

    console.log('[Scheduler] Started — checking due dates every hour');
}