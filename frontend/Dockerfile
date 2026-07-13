# Stage 1: Build the React Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency configs first to optimize build cache
COPY package*.json ./
RUN npm ci

# Copy full frontend sources and compile the production build
COPY . .
RUN npm run build

# Stage 2: Serve the compiled app with Nginx
FROM nginx:alpine

# Copy built static assets from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
