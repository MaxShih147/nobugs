FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY docker/serve-static.js ./serve-static.js
EXPOSE 3001
CMD ["node", "serve-static.js"]
