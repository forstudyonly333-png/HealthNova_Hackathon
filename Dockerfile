# ==========================================
# Stage 1: Build frontend and assets
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* bun.lock* ./
RUN npm install

# Copy source code and build production Vite bundle
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Minimal Production Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV DEMO_MODE=true
ENV WHATSAPP_PROVIDER=simulated

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled frontend from builder
COPY --from=builder /app/dist ./dist

# Copy backend server code, utilities, scripts, and static public assets
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/utils ./src/utils
COPY --from=builder /app/src/types.ts ./src/types.ts

# Ensure data directory exists for SQLite database storage
RUN mkdir -p /app/server/data

# Expose standard Cloud Run port
EXPOSE 8080

# Health check to ensure service readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start unified web service with one command
CMD ["node", "server.ts"]
