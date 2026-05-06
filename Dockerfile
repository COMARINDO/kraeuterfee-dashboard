# Kräuterfee Dashboard — Next.js 16 (Node 22), Prisma + SQLite (better-sqlite3)
# Build: DOCKER_BUILD=1 aktiviert output: "standalone" in next.config.ts
ARG PRISMA_VERSION=7.8.0

FROM node:22-bookworm AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci

COPY . .

ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build:docker

# ---

FROM node:22-bookworm-slim AS runner
ARG PRISMA_VERSION=7.8.0

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g "prisma@${PRISMA_VERSION}" \
  && npm cache clean --force

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV DOCKER_BUILD=1
ENV KRAEUTERFEE_RUNTIME=docker
# 8 GB VPS (mehrere Dienste): konservativer Node-Heap; in Coolify überschreibbar, z. B. 512
ENV NODE_OPTIONS="--max-old-space-size=384"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs \
  && mkdir -p /data \
  && chown nextjs:nodejs /data

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

LABEL org.opencontainers.image.title="Kräuterfee Dashboard" \
      org.opencontainers.image.description="Next.js Social Publishing Dashboard"

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=8s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/api/health >/dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
