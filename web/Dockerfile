# Build context: repository root (npm workspaces share a single lockfile)
FROM node:22-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/db/package.json packages/db/
COPY worker/package.json worker/
COPY web/package.json web/
RUN npm ci -w @immofilter/db -w web

COPY packages/db/ packages/db/
COPY web/ web/
RUN npm run build -w @immofilter/db && npm run build -w web

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3800

COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./web/.next/static
COPY --from=builder /app/web/public ./web/public

USER node
EXPOSE 3800

CMD ["node", "web/server.js"]
