FROM --platform=linux/amd64 node:latest as BUILD_STAGE
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

FROM --platform=linux/amd64 node:alpine
WORKDIR /app
COPY --from=BUILD_STAGE /app/dist ./

CMD ["node", "index.js"]
