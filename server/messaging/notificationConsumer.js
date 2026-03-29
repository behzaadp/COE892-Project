import { Notification } from '../models/index.js';

async function saveNotification({ userId, type, title, message }) {
  try {
    await Notification.create({ userId, type, title, message });
    console.log(`[Notifications] Saved: ${type} for user ${userId}`);
  } catch (err) {
    console.error('[Notifications] Failed to save notification', err);
  }
}

async function handleNotificationsQueue(msg, channel) {
  const event = JSON.parse(msg.content.toString());
  console.log('[Notifications] Received from notifications queue:', event.type);

  if (event.type === 'BORROWED_RENEWED') {
    await saveNotification({
      userId: event.userId,
      type: 'BORROWED_RENEWED',
      title: 'Item Renewed',
      message: `Your borrowed item has been renewed. New due date: ${event.dueDate}.`
    });
  } else {
    console.log('[Notifications] Ignoring unhandled type:', event.type);
  }

  channel.ack(msg);
}

async function handleHoldsQueue(msg, channel) {
  const event = JSON.parse(msg.content.toString());
  console.log('[Notifications] Received from holds queue:', event.type);

  if (event.type === 'HOLD_REQUESTED') {
    await saveNotification({
      userId: event.userId,
      type: 'HOLD_PLACED',
      title: 'Hold Placed',
      message: `Your hold on "${event.itemTitle}" has been placed successfully.`
    });
  } else if (event.type === 'HOLD_REMOVED') {
    await saveNotification({
      userId: event.userId,
      type: 'HOLD_REMOVED',
      title: 'Hold Removed',
      message: `Your hold on "${event.itemTitle}" has been removed.`
    });
  } else {
    console.log('[Notifications] Ignoring unhandled type:', event.type);
  }

  channel.ack(msg);
}

export function startNotificationConsumer(channel, notificationsQueue, holdsQueue) {
  channel.consume(notificationsQueue, (msg) => {
    if (!msg) return;
    handleNotificationsQueue(msg, channel).catch((err) => {
      console.error('[Notifications] Error processing notifications queue message', err);
      channel.nack(msg, false, false);
    });
  });

  channel.consume(holdsQueue, (msg) => {
    if (!msg) return;
    handleHoldsQueue(msg, channel).catch((err) => {
      console.error('[Notifications] Error processing holds queue message', err);
      channel.nack(msg, false, false);
    });
  });

  console.log('[Notifications] Consumer started on queues:', notificationsQueue, '&', holdsQueue);
}
