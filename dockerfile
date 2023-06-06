FROM --platform=linux/amd64 node:latest
WORKDIR /app
COPY . .
RUN npm install

CMD ["node", "index.js"]
