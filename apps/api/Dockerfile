FROM node:23-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev for build)
RUN npm i

# Copy source code
COPY src/ ./src/

# Build the TypeScript code
RUN npm run build

# Copy JavaScript drizzle config for production
COPY drizzle.config.js ./

# Copy migration files to build directory to match config
COPY src/db/migrations/ ./build/db/migrations/

# Remove dev dependencies after build
RUN npm prune --production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S stepexplorer -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R stepexplorer:nodejs /app
USER stepexplorer

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["npm", "start"]