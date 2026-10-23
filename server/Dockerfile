FROM node:22-alpine
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4301
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
USER node
EXPOSE 4301
CMD ["node", "src/server.mjs"]
