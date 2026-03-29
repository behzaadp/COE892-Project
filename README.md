# COE892-Project – Automated Library System

Full-stack demo that showcases:
- React + Vite frontend
- Node/Express REST API with MongoDB (Atlas or local)
- gRPC service that mirrors the REST operations
- RabbitMQ messaging for holds/notifications

## Prerequisites
- Node.js 20.x (or newer) + npm
- Docker Desktop (containerized deployment)
- MongoDB (Atlas cluster **or** Docker/local instance)
- RabbitMQ (Docker, CloudAMQP, etc.) for hold/notification features

## Required environment variables
Create a `.env` file in the project root (same folder as `package.json`). Minimum values:
```
MONGODB_URI=<your Atlas or local connection string>
MONGODB_DB=library
RABBITMQ_URL=amqp://guest:guest@localhost:5672   # or your managed broker URL
RABBITMQ_EXCHANGE=library.events
RABBITMQ_NOTIFICATIONS_QUEUE=library.notifications
RABBITMQ_HOLDS_QUEUE=library.holds
PORT=4000
GRPC_PORT=50051
VITE_API_BASE_URL=http://localhost:4000/api
```
(Do not commit `.env`. If you deploy, set the same keys via your hosting platform’s secret manager.)

## Local run
1. **Clone** the repo and `cd` into it.
2. **Start MongoDB**:
   - Atlas: create a database user + allow your IP, then copy the `mongodb+srv://…` URI.
   - Local Docker: `docker run -d --name library-mongo -p 27017:27017 mongo:7`.
3. **Start RabbitMQ** (if you need hold/notification flows). Example Docker command:
   ```
   docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
   ```
4. **Install deps & run**:
   ```
   npm install
   npm run dev
   ```
   This launches:
   - React front-end at http://localhost:5173
   - Express+Mongo REST API at http://localhost:4000/api
   - gRPC server on localhost:50051
   - RabbitMQ consumer + scheduler background jobs

## Cloud / Docker deployment
1. Ensure your `.env` (or platform secrets) contains the Atlas connection string and RabbitMQ URL that the container can reach.
2. Build/run with Docker Compose:
   ```
   npm install
   docker compose up --build
   ```
   Exposed services:
   - REST API: http://localhost:4000/api
   - Front-end: http://localhost:5173
   - gRPC: localhost:50051
   - RabbitMQ AMQP: amqp://localhost:5672
   - RabbitMQ UI: http://localhost:15672 (guest/guest)
3. Tear down/reset:
   ```
   docker compose down
   docker system prune -a -f
   ```

## gRPC service
- Proto definition: `server/proto/library.proto`.
- Server starts with Express (port via `GRPC_PORT`, default 50051).
- RPCs: `ListLibraryItems`, `GetLibraryItem`, `GetUserBorrowedItems`, `RenewBorrowedItem`, `PlaceHoldRequest`.
- Example (requires [grpcurl](https://github.com/fullstorydev/grpcurl)):
  ```
  grpcurl -plaintext -proto server/proto/library.proto localhost:50051 library.LibraryService/ListLibraryItems
  ```

## RabbitMQ messaging
- Configured via the `RABBITMQ_*` env vars above.
- Management UI (if using the Docker example): http://localhost:15672.
- Holds: `POST /api/library-items/:id/hold` with `{ "userId": "<user-id>", "contact": "sms:+1437..." }` enqueues a hold job.
- Renewals (REST `/api/borrowed/:id/renew` or gRPC `RenewBorrowedItem`) emit `BORROWED_RENEWED` events.

## MongoDB tips
- Atlas setup: after creating a cluster, go to **Security → Database Access** to add a user, then **Network Access** to whitelist your IP.
- VS Code: install the “MongoDB for VS Code” extension to browse collections. Use the same `MONGODB_URI` to connect.
- The backend seeds demo data (admin user, catalog, borrowed items) automatically the first time it connects to an empty database.
