// server/messaging/notificationConsumer.js
import { db } from '../db.js';
import { randomUUID } from 'node:crypto';

function saveNotification({ userId, type, title, message }) {
    try {
        db.prepare(`
      INSERT INTO notifications (id, userId, type, title, message, read, createdAt)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).run(randomUUID(), userId, type, title, message, new Date().toISOString());
        console.log(`[Notifications] Saved: ${type} for user ${userId}`);
    } catch (err) {
        console.error('[Notifications] Failed to save notification', err);
    }
}

function handleNotificationsQueue(msg, channel) {
    const event = JSON.parse(msg.content.toString());
    console.log('[Notifications] Received from notifications queue:', event.type);

    if (event.type === 'BORROWED_RENEWED') {
        saveNotification({
            userId: event.userId,
            type: 'BORROWED_RENEWED',
            title: 'Item Renewed',
            message: `Your borrowed item has been renewed. New due date: ${event.dueDate}.`,
        });
    } else {
        console.log('[Notifications] Ignoring unhandled type:', event.type);
    }

    channel.ack(msg);
}

function handleHoldsQueue(msg, channel) {
    const event = JSON.parse(msg.content.toString());
    console.log('[Notifications] Received from holds queue:', event.type);

    if (event.type === 'HOLD_REQUESTED') {
        saveNotification({
            userId: event.userId,
            type: 'HOLD_PLACED',
            title: 'Hold Placed',
            message: `Your hold on "${event.itemTitle}" has been placed successfully.`,
        });
    } else if (event.type === 'HOLD_REMOVED') {
        saveNotification({
            userId: event.userId,
            type: 'HOLD_REMOVED',
            title: 'Hold Removed',
            message: `Your hold on "${event.itemTitle}" has been removed.`,
        });
    } else {
        console.log('[Notifications] Ignoring unhandled type:', event.type);
    }

    channel.ack(msg);
}

export function startNotificationConsumer(channel, notificationsQueue, holdsQueue) {
    // Listen to library.notifications queue
    channel.consume(notificationsQueue, (msg) => {
        if (!msg) return;
        try {
            handleNotificationsQueue(msg, channel);
        } catch (err) {
            console.error('[Notifications] Error processing notifications queue message', err);
            channel.nack(msg, false, false);
        }
    });

    // Listen to library.holds queue
    channel.consume(holdsQueue, (msg) => {
        if (!msg) return;
        try {
            handleHoldsQueue(msg, channel);
        } catch (err) {
            console.error('[Notifications] Error processing holds queue message', err);
            channel.nack(msg, false, false);
        }
    });

    console.log('[Notifications] Consumer started on queues:', notificationsQueue, '&', holdsQueue);
}