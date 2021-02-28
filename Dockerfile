FROM node:15.10.0-alpine3.10

WORKDIR /app

COPY src/ /app/src
RUN npm i

EXPOSE 8080
CMD [ "node", "src/server.js" ]