FROM node:22-alpine

WORKDIR /app

COPY package*.json package-lock.json ./

RUN npm ci

#COPY --chown=node:node . .
COPY --chown=node:node app.js ./
COPY --chown=node:node Api ./Api
COPY --chown=node:node config ./config
COPY --chown=node:node middleware ./middleware
COPY --chown=node:node models ./models
COPY --chown=node:node validations ./validations


EXPOSE 5000

USER node

CMD ["npm", "run", "dev"]
