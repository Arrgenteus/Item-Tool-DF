# syntax=docker/dockerfile:1

FROM node:16.13.0-slim
WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
RUN npm install

COPY . /app

CMD ["npm", "start", "register-slash"]