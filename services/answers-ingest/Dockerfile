# syntax=docker/dockerfile:1.7
FROM node:26-alpine3.23 AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:26-alpine3.23 AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src
COPY package.json ./
USER app
EXPOSE 3002
ENV NODE_ENV=production PORT=3002
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s \
  CMD wget -qO- http://localhost:3002/health || exit 1
CMD ["node", "src/server.js"]
