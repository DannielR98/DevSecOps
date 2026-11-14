FROM node:25-alpine

WORKDIR /app

# Basimagens npm bundlar sårbara interna beroenden (Trivy)
RUN npm install -g npm@^12

COPY package*.json package-lock.json ./

RUN npm ci

#COPY --chown=node:node . .
COPY --chown=node:node src ./src
COPY --chown=node:node public ./public
COPY --chown=node:node index.html vite.config.ts playwright.config.ts ./
COPY --chown=node:node tsconfig*.json ./

RUN chown -R node:node /app

EXPOSE 3000

USER node

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
