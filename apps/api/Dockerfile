FROM node:23-alpine

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev deps for building)
RUN npm install

# Copy source code
COPY src/ ./src/

# Build the TypeScript code
RUN npm run build

# Switch to production dependencies only
RUN npm ci --only=production

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]