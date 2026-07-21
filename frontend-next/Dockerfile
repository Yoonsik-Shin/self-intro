FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 브라우저에 노출되는 NEXT_PUBLIC_* 값은 빌드 타임에 번들에 박히므로, 런타임 env로는
# 바꿀 수 없다 — k8s envFrom이 아니라 반드시 docker build --build-arg로 주입해야 한다.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER nextjs:nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENTRYPOINT ["node", "server.js"]
