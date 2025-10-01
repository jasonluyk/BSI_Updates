FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN apt-get update && apt-get install -y python3 make g++ git \
    && npm install --build-from-source sqlite3 \
    && apt-get clean

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
