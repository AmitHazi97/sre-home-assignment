FROM node:22-alpine
WORKDIR /app

COPY api/package*.json ./
RUN npm install --omit=dev

COPY api/src ./src
COPY db ./db

ENV SCHEMA_PATH=/app/db/schema.sql \
    SEED_PATH=/app/db/seed.sql

EXPOSE 3000
CMD ["node", "src/server.js"]
