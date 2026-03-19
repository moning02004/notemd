# -------------------------
# 1) Builder Stage
# -------------------------
FROM node:20-slim AS builder

WORKDIR /app

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 의존성 캐싱을 위한 파일 먼저 복사
COPY package.json pnpm-lock.yaml ./

# pnpm store 캐시 활용
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# 전체 소스 복사
COPY . .

# Next.js standalone 빌드
RUN pnpm build

# -------------------------
# 2) Runner Stage
# -------------------------
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# pnpm 필요 없음 (standalone 실행은 node로 가능)
# 하지만 유지보수 위해 활성화해도 OK
RUN corepack enable

# standalone 결과물만 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

# Next standalone 실행
CMD ["node", "server.js"]