FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY --chown=node:node . .

EXPOSE 3000

USER node

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
