# syntax=docker/dockerfile:1

FROM node:20.12.2-slim
WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
RUN npm install

COPY . /app

RUN mkdir /app/dataStorage/

CMD ["npm", "start", "register-slash"]
