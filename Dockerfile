# Backend container for the Express + gRPC API
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies from the root package.json
COPY package*.json ./
RUN npm install --omit=dev

# Copy backend source
COPY server ./server
WORKDIR /app/server

EXPOSE 4000 50051
CMD ["node", "index.js"]
