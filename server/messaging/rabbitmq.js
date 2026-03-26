import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = process.env.RABBITMQ_EXCHANGE || 'library.events';
const NOTIFICATIONS_QUEUE = process.env.RABBITMQ_NOTIFICATIONS_QUEUE || 'library.notifications';
const HOLDS_QUEUE = process.env.RABBITMQ_HOLDS_QUEUE || 'library.holds';

let connection;
let channel;
let initializing;

async function ensureChannel() {
  if (channel) {
    return channel;
  }
  if (initializing) {
    return initializing;
  }

  initializing = (async () => {
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on('close', () => {
      channel = undefined;
      initializing = undefined;
      console.warn('RabbitMQ connection closed. Reconnecting...');
      setTimeout(() => ensureChannel().catch(() => {}), 5000);
    });
    connection.on('error', (error) => {
      console.error('RabbitMQ connection error', error);
    });

    channel = await connection.createConfirmChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    await channel.assertQueue(NOTIFICATIONS_QUEUE, { durable: true });
    await channel.assertQueue(HOLDS_QUEUE, { durable: true });
    await channel.bindQueue(NOTIFICATIONS_QUEUE, EXCHANGE_NAME, 'notifications.*');
    await channel.bindQueue(HOLDS_QUEUE, EXCHANGE_NAME, 'holds.*');
    console.log('Connected to RabbitMQ and declared queues');
    return channel;
  })();

  return initializing;
}

async function publish(routingKey, payload) {
  try {
    const ch = await ensureChannel();
    return await new Promise((resolve, reject) => {
      ch.publish(
        EXCHANGE_NAME,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, contentType: 'application/json' },
        (err) => (err ? reject(err) : resolve())
      );
    });
  } catch (error) {
    console.error(`Failed to publish message to ${routingKey}`, error);
    throw error;
  }
}

export async function initializeMessaging() {
  await ensureChannel();
}

export async function publishNotificationEvent(payload) {
  return publish('notifications.events', payload);
}

export async function publishHoldRequest(payload) {
  return publish('holds.requests', payload);
}

export async function shutdownMessaging() {
  await channel?.close().catch(() => {});
  await connection?.close().catch(() => {});
  channel = undefined;
  connection = undefined;
  initializing = undefined;
}
