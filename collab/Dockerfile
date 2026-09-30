# 운영 이미지. 에디터와 같은 스키마(frontend/lib/editor_schema.ts)를 넣어야 하므로 저장소 루트에서 빌드한다.
#   docker build -f collab/Dockerfile -t yujeonghoon/notemd_collab:$TAG .
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY collab/package.json collab/package-lock.json ./
# tsx(개발 의존성)로 TypeScript 를 그대로 실행하므로 개발 의존성까지 설치한다.
RUN --mount=type=cache,id=npm-cache,target=/root/.npm \
    npm ci --include=dev

COPY collab/src ./src
COPY frontend/lib/editor_schema.ts ./src/editor_schema.ts

USER node
EXPOSE 1234
CMD ["npx", "tsx", "src/server.ts"]
