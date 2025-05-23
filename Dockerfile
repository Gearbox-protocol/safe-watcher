FROM node:24@sha256:7cd385e17f9d66b2c3ae40597359286073a33266db71b5f01ce2d87db81b52f7 AS build

WORKDIR /app
COPY package.json /app/

RUN npm install

COPY . /app
RUN npm run build

FROM node:24-alpine

# Update packages and install dependencies
RUN apk --no-cache add curl jq xxd

# Set the default shell to zsh
ENV SHELL=/usr/bin/zsh
SHELL ["/usr/bin/zsh", "-c"]

USER 1000:1000

WORKDIR /app

ENV NODE_ENV=production

ARG PACKAGE_VERSION
LABEL org.opencontainers.image.version="${PACKAGE_VERSION}"

COPY --from=build /app/dist /app

COPY src/safe-hashes/safe_hashes.sh /app/safe-hashes.sh

# Copy foundry tools
COPY --from=ghcr.io/foundry-rs/foundry:stable /usr/local/bin/chisel /usr/local/bin/chisel
COPY --from=ghcr.io/foundry-rs/foundry:stable /usr/local/bin/cast /usr/local/bin/cast

CMD ["/app/index.mjs"]
