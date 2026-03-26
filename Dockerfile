# Use Node image
FROM node:18

WORKDIR /app

# Install dependencies
COPY server/package*.json ./
RUN npm install

# Copy backend code
COPY server/ .

# Run correct file
EXPOSE 4000 50051
CMD ["node", "index.js"]
