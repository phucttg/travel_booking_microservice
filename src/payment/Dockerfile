# syntax=docker/dockerfile:1
FROM node:20.19.2-alpine AS builder
WORKDIR /app

ENV NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000

COPY src/building-blocks/package*.json /app/src/building-blocks/
WORKDIR /app/src/building-blocks
RUN set -eux; \
    for i in 1 2 3; do \
      npm ci --no-audit --no-fund && break; \
      if [ "$i" -eq 3 ]; then exit 1; fi; \
      sleep "$((i * 10))"; \
    done; \
    npm cache clean --force

COPY src/building-blocks /app/src/building-blocks

COPY src/payment/package*.json /app/src/payment/
WORKDIR /app/src/payment
RUN set -eux; \
    for i in 1 2 3; do \
      npm ci --no-audit --no-fund && break; \
      if [ "$i" -eq 3 ]; then exit 1; fi; \
      sleep "$((i * 10))"; \
    done; \
    npm cache clean --force

COPY src/payment /app/src/payment
RUN npm run build

FROM node:20.19.2-alpine AS runner
WORKDIR /app/src/payment

ENV NODE_ENV=docker \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000 \
    NPM_CONFIG_FETCH_TIMEOUT=120000

COPY src/payment/package*.json ./
RUN set -eux; \
    for i in 1 2 3; do \
      npm ci --omit=dev --no-audit --no-fund && break; \
      if [ "$i" -eq 3 ]; then exit 1; fi; \
      sleep "$((i * 10))"; \
    done; \
    npm cache clean --force

COPY --from=builder /app/src/payment/dist ./dist
COPY --from=builder /app/src/payment/.env.development ./dist
COPY --from=builder /app/src/building-blocks ../building-blocks

EXPOSE 3377
CMD ["node", "dist/main.js"]
