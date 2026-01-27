FROM node:18-slim

WORKDIR /app

COPY package*.json ./
COPY index.js ./
COPY assets ./assets

RUN npm install

CMD ["node", "/app/index.js"]