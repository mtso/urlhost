FROM node:18-slim AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

#######################################################################

FROM node:18-slim

LABEL fly_launch_runtime="nodejs"

WORKDIR /app
ENV NODE_ENV production

COPY --from=builder /app /app

EXPOSE 8080

CMD [ "yarn", "run", "start" ]

