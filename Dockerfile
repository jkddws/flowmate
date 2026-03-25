# ============================================
# FlowMate - Visual Workflow Builder
# Multi-stage Docker build for production
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN npm install -g pnpm@10
WORKDIR /app
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/api/package.json ./packages/api/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Stage 2: Build
FROM node:20-alpine AS builder
RUN npm install -g pnpm@10
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY . .

# Generate Prisma client
RUN cd packages/api && npx prisma generate

# Build all packages
RUN pnpm --filter @flowmate/shared run build 2>/dev/null || true
RUN pnpm --filter @flowmate/api run build
RUN pnpm --filter @flowmate/web run build

# Stage 3: Production
FROM node:20-alpine AS runner
RUN npm install -g pnpm@10
WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder /app/packages/web/.next ./packages/web/.next
COPY --from=builder /app/packages/web/public ./packages/web/public
COPY --from=builder /app/packages/web/package.json ./packages/web/
COPY --from=builder /app/packages/web/next.config.js ./packages/web/
COPY --from=builder /app/packages/web/node_modules ./packages/web/node_modules
COPY --from=builder /app/node_modules ./node_modules
COPY package.json pnpm-workspace.yaml ./

# Entrypoint script
COPY <<'ENTRYPOINT' /app/start.sh
#!/bin/sh
set -e
echo "FlowMate starting..."
echo "Applying database migrations..."
cd /app/packages/api && npx prisma db push --skip-generate 2>&1 || echo "DB push failed (may need DATABASE_URL)"
echo "Starting API server..."
cd /app/packages/api && node dist/index.js &
echo "Starting web server..."
cd /app/packages/web && npx next start -p 3000 &
echo "FlowMate ready!"
wait
ENTRYPOINT
RUN chmod +x /app/start.sh

ENV NODE_ENV=production
EXPOSE 3000 3001

CMD ["/app/start.sh"]
