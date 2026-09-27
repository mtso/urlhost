FROM node:24-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

#######################################################################

FROM node:24-slim

LABEL fly_launch_runtime="nodejs"

WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app /app

EXPOSE 8080

CMD [ "npm", "start" ]

