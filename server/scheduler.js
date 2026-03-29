import { BorrowedItem, Notification } from './models/index.js';

async function saveNotification({ userId, type, title, message, itemTitle }) {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existing = await Notification.findOne({
      userId,
      type,
      title,
      createdAt: { $gte: startOfDay, $lt: endOfDay },
      message: itemTitle ? { $regex: itemTitle, $options: 'i' } : undefined
    }).lean();

    if (existing) return;

    await Notification.create({ userId, type, title, message });
    console.log(`[Scheduler] Saved: ${type} for user ${userId}`);
  } catch (err) {
    console.error('[Scheduler] Failed to save notification', err);
  }
}

async function checkDueDates() {
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

  const rows = await BorrowedItem.find().populate('item').lean();

  for (const row of rows) {
    const { userId, dueDate } = row;
    const title = row.item?.title ?? 'Library Item';

    if (dueDate === todayStr) {
      await saveNotification({
        userId,
        type: 'DUE_TODAY',
        title: 'Item Due Today',
        message: `"${title}" is due back today. Please return or renew it.`,
        itemTitle: title
      });
    }

    if (dueDate === in3DaysStr) {
      await saveNotification({
        userId,
        type: 'DUE_SOON',
        title: 'Item Due Soon',
        message: `"${title}" is due in 3 days (${dueDate}). Consider renewing it.`,
        itemTitle: title
      });
    }

    if (dueDate <= yesterdayStr) {
      await saveNotification({
        userId,
        type: 'OVERDUE',
        title: 'Item Overdue',
        message: `"${title}" was due on ${dueDate} and is now overdue. Please return it.`,
        itemTitle: title
      });
    }
  }
}

export function startScheduler() {
  const run = () => {
    checkDueDates().catch((error) => console.error('[Scheduler] Failed run', error));
  };

  run();
  setInterval(run, 60 * 60 * 1000);

  console.log('[Scheduler] Started – checking due dates every hour');
}
