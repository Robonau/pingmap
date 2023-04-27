FROM node:19-alpine as develop-stage

WORKDIR /app

COPY ./package*.json ./tsconfig.json ./

RUN npm install && npm cache clean --force

COPY . .

RUN npx prisma generate

RUN npm run build

RUN apk update && \
	apk add pingu

FROM develop-stage as prod-stage

WORKDIR /app

CMD [ "npm", "run", "startjs", "--logs-max=0" ]