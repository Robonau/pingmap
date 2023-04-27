FROM node:19-alpine as develop-stage

WORKDIR /app

COPY ./package*.json ./

RUN npm install && npm cache clean --force

COPY . .

RUN apk update && \
	apk add pingu

RUN npm run build

# build stage
FROM develop-stage as prod-stage

WORKDIR /app

CMD [ "npm", "run", "startjs" ]