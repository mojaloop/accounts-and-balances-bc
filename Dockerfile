# syntax=docker/dockerfile:1

FROM node:18.13.0

ENV NODE_ENV=development

WORKDIR /app

COPY ["package.json", "package-lock.json", "./"]

RUN npm install

RUN npm run build

COPY . .

CMD ["node", "server.js"]

EXPOSE 1234

CMD npm run start:accounts-and-balances-svc
