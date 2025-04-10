FROM node:16 AS build

WORKDIR /app
COPY package.json /app/

RUN npm install

COPY . /app
RUN npm run build

FROM gcr.io/distroless/nodejs22-debian12

USER 1000:1000

WORKDIR /app

ENV NODE_ENV=production

ARG PACKAGE_VERSION
LABEL org.opencontainers.image.version="${PACKAGE_VERSION}"

COPY --from=build /app/dist /app

CMD ["/app/index.mjs"]
