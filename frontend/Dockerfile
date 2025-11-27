# -------------------------
# 1) Builder Stage
# -------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm ci

# 전체 소스 복사
COPY . .

# Next.js 빌드
RUN npm run build

# -------------------------
# 2) Runner Stage
# -------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 필요한 파일만 복사
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

# 프로덕션 서버 실행
CMD ["npm", "run", "start"]
