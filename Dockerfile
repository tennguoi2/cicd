FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install && npm install nodemon --save-dev

COPY . .

EXPOSE 3000

ENV PORT=3001
CMD ["npx", "nodemon", "assets/js/api.js"]