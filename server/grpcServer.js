import path from 'node:path';
import { fileURLToPath } from 'node:url';
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import {
  listLibraryItems,
  getLibraryItemById,
  getBorrowedItemsByUser,
  renewBorrowedItem,
  getUserById
} from './services/libraryService.js';
import { publishNotificationEvent, publishHoldRequest } from './messaging/rabbitmq.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROTO_PATH = path.join(__dirname, 'proto', 'library.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const libraryProto = grpc.loadPackageDefinition(packageDefinition).library;

function mapLibraryItem(item) {
  if (!item) return null;
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    genre: item.genre,
    format: item.format,
    status: item.status,
    description: item.description,
    publishedDate: item.publishedDate,
    location: item.location,
    isbn: item.isbn ?? '',
    coverImage: item.coverImage ?? '',
    pages: item.pages ?? 0,
    language: item.language
  };
}

function mapBorrowedRecord(record) {
  if (!record) return null;
  return {
    id: record.id,
    borrowDate: record.borrowDate,
    dueDate: record.dueDate,
    renewals: record.renewals,
    item: mapLibraryItem(record.item),
    userId: record.userId ?? ''
  };
}

function grpcErrorFrom(error) {
  const statusCode = error?.statusCode;
  if (statusCode === 404) {
    return { code: grpc.status.NOT_FOUND, message: error.message };
  }
  if (statusCode === 400) {
    return { code: grpc.status.INVALID_ARGUMENT, message: error.message };
  }
  return { code: grpc.status.INTERNAL, message: error?.message ?? 'Unexpected error' };
}

const serviceImplementation = {
  async ListLibraryItems(call, callback) {
    try {
      const items = await listLibraryItems(call.request ?? {});
      callback(null, { items: items.map(mapLibraryItem) });
    } catch (error) {
      callback(grpcErrorFrom(error));
    }
  },
  async GetLibraryItem(call, callback) {
    try {
      const id = call.request?.id;
      if (!id) {
        return callback(grpcErrorFrom({ statusCode: 400, message: 'id is required' }));
      }
      const item = await getLibraryItemById(id);
      if (!item) {
        return callback(grpcErrorFrom({ statusCode: 404, message: 'Item not found' }));
      }
      callback(null, { item: mapLibraryItem(item) });
    } catch (error) {
      callback(grpcErrorFrom(error));
    }
  },
  async GetUserBorrowedItems(call, callback) {
    try {
      const userId = call.request?.userId;
      if (!userId) {
        return callback(grpcErrorFrom({ statusCode: 400, message: 'userId is required' }));
      }
      const records = await getBorrowedItemsByUser(userId);
      callback(null, { borrowed: records.map(mapBorrowedRecord) });
    } catch (error) {
      callback(grpcErrorFrom(error));
    }
  },
  async RenewBorrowedItem(call, callback) {
    try {
      const borrowedId = call.request?.borrowedId;
      if (!borrowedId) {
        return callback(grpcErrorFrom({ statusCode: 400, message: 'borrowedId is required' }));
      }
      const record = renewBorrowedItem(borrowedId);
      await publishNotificationEvent({
        type: 'BORROWED_RENEWED',
        borrowedId: record.id,
        userId: record.userId,
        itemId: record.item?.id,
        dueDate: record.dueDate,
        renewals: record.renewals,
        timestamp: new Date().toISOString()
      }).catch(() => {});
      callback(null, { record: mapBorrowedRecord(record) });
    } catch (error) {
      callback(grpcErrorFrom(error));
    }
  },
  async PlaceHoldRequest(call, callback) {
    try {
      const { userId, itemId, contact } = call.request ?? {};
      if (!userId || !itemId) {
        return callback(grpcErrorFrom({ statusCode: 400, message: 'userId and itemId are required' }));
      }
      const user = await getUserById(userId);
      if (!user) {
        return callback(grpcErrorFrom({ statusCode: 404, message: 'User not found' }));
      }
      const item = await getLibraryItemById(itemId);
      if (!item) {
        return callback(grpcErrorFrom({ statusCode: 404, message: 'Library item not found' }));
      }
      await publishHoldRequest({
        userId,
        itemId,
        contact,
        userName: user.name,
        itemTitle: item.title,
        requestedAt: new Date().toISOString()
      });
      callback(null, { accepted: true, message: 'Hold request enqueued' });
    } catch (error) {
      callback(grpcErrorFrom(error));
    }
  }
};

export function startGrpcServer(port = Number(process.env.GRPC_PORT) || 50051) {
  const server = new grpc.Server();
  server.addService(libraryProto.LibraryService.service, serviceImplementation);

  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err, boundPort) => {
    if (err) {
      console.error('Failed to start gRPC server', err);
      return;
    }
    server.start();
    console.log(`Library gRPC server running on 0.0.0.0:${boundPort}`);
  });

  return server;
}
