FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY server/ ./server/

RUN npm install

WORKDIR /app/server
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/index.js"]
