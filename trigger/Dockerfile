FROM node:20-alpine

WORKDIR /app

COPY trigger/package.json trigger/package-lock.json ./
RUN npm ci

COPY trigger/ .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
