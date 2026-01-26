FROM node:24.11.1-slim

WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]

