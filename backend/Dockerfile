FROM node:22-slim

WORKDIR /app

# зависимости (tsx нужен в рантайме — ставим всё)
COPY package.json package-lock.json ./
RUN npm ci

# исходники
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["npm", "start"]
