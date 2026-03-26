# COE892-Project-Automated Library System

download repo, open terminal in the downloaded folder

## LOCAL RUN

To run it on your computer LOCALLY, run:
```
npm install
npm run dev
```

This starts:
- React front-end via Vite on http://localhost:5173
- Express + SQLite REST API on http://localhost:4000/api
- gRPC server on http://localhost:50051 (see gRPC section below). RabbitMQ is optional in local dev but required for hold/notification flows.

## CLOUD RUN

To run the repo in a container via CLOUD, run:
```
npm install
docker compose up --build
NOTE: Docker requires Docker Desktop to be downloaded
```
This will build the frontend/backend images, start RabbitMQ (with the management plugin), and expose:
- REST API: http://localhost:4000/api
- Front-end: http://localhost:5173
- gRPC server: localhost:50051
- RabbitMQ AMQP: amqp://localhost:5672
- RabbitMQ Management UI: http://localhost:15672 (default user/pass: guest/guest)

To stop and do a fresh start of docker, run:
```
docker compose down
docker system prune -a -f
```

## gRPC service

- Proto definition lives in `server/proto/library.proto`.
- The gRPC server starts automatically with the Express API (port configurable via `GRPC_PORT`, default `50051`).
- Available RPCs mirror the REST API (`ListLibraryItems`, `GetLibraryItem`, `GetUserBorrowedItems`, `RenewBorrowedItem`) and add `PlaceHoldRequest`, which drops a hold job on RabbitMQ.

Example gRPC call using grpcurl (requires grpcurl to be installed):
```
grpcurl -plaintext -proto server/proto/library.proto localhost:50051 library.LibraryService/ListLibraryItems
```
NOTE: Install a generic client like grpcurl (https://github.com/fullstorydev/grpcurl/releases) and add it to your PATH. 

grpcurl is required only if the user would like to interact with the gRPC client.  

## RabbitMQ messaging

- RabbitMQ connection details are controlled via `RABBITMQ_URL`, `RABBITMQ_EXCHANGE`, `RABBITMQ_NOTIFICATIONS_QUEUE`, and `RABBITMQ_HOLDS_QUEUE`. Defaults match the docker compose values.
- RabbitMQ management UI: http://localhost:15672 (guest/guest). You can watch the `library.notifications` and `library.holds` queues grow as you trigger renewals or hold requests.
- HTTP endpoint to enqueue holds: `POST http://localhost:4000/api/library-items/:id/hold` with JSON body `{ "userId": "<user-id>", "contact": "sms:+1437..." }`.
- Renewing borrowed items (REST `/api/borrowed/:id/renew` or the `RenewBorrowedItem` gRPC method) emits a `BORROWED_RENEWED` notification event.

## SQLite 

Using VS Code, download the SQLite Extension by alexcvzz to view SQL Tables
The extension will be visible on the Explorer side bar as SQLITE EXPLORER