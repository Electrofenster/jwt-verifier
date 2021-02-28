FROM node:15.10.0-alpine3.10

WORKDIR /app

EXPOSE 8080
CMD [ "node", "src/server.js" ]