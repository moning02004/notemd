# -------------------------
# 1) Builder Stage
# -------------------------
FROM node:22-slim AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_HOST
ENV NEXT_PUBLIC_API_HOST=$NEXT_PUBLIC_API_HOST

COPY package.json ./

RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm install

COPY . .

RUN npm run build

# -------------------------
# 2) Runner Stage
# -------------------------
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]