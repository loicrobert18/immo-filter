# Build context: repository root (npm workspaces share a single lockfile)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/db/package.json packages/db/
COPY worker/package.json worker/
COPY web/package.json web/
RUN npm ci -w @immofilter/db -w worker

COPY packages/db/ packages/db/
COPY worker/tsconfig.json worker/
COPY worker/src/ worker/src/
RUN npm run build -w @immofilter/db && npm run build -w worker

FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/db/package.json packages/db/
COPY worker/package.json worker/
COPY web/package.json web/
RUN npm ci --omit=dev -w @immofilter/db -w worker

COPY --from=builder /app/packages/db/dist ./packages/db/dist/
COPY --from=builder /app/worker/dist ./worker/dist/

# Working directory stays /app so failed mails land in the mounted /app/data
CMD ["node", "worker/dist/index.js"]
