FROM node:24@sha256:c332080545f1de96deb1c407e6fbe9a7bc2be3645e127845fdcce57a7af3cf56 AS build

WORKDIR /app
COPY package.json /app/

RUN npm install

COPY . /app
RUN npm run build

FROM node:24-alpine@sha256:dfea0736e82fef246aba86b2082a5e86c4825470302692b841d097dd61253b79

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
