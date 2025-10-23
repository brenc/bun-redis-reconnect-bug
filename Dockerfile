ARG BUN_VERSION=1.3.1

FROM oven/bun:${BUN_VERSION}-slim AS bun

FROM debian:bookworm-slim AS base

ARG \
  UID=2000 \
  USER=test-user

ENV \
  APP_NAME=ngguard \
  BUILD_DIR=/build \
  CI=true \
  DEBIAN_FRONTEND=noninteractive \
  TZ=America/New_York \
  USER=${USER}

RUN \
  --mount=type=cache,sharing=locked,target=/var/cache/apt \
  --mount=type=cache,sharing=locked,target=/var/lib/apt/lists \
  set -eux; \
  # This is needed to prevent apt from cleaning up the cache and lists which
  # are cached.
  rm -rf /etc/apt/apt.conf.d/docker-clean; \
  apt-get update; \
  apt-get install -y --no-install-recommends \
  ca-certificates \
  curl; \
  useradd -m -u ${UID} -U ${USER} -s /bin/bash;

FROM base AS base_development

ARG WATCHEXEC_VERSION=2.3.2

# Bun's built-in watch mode doesn't stop when the app exits, so we use watchexec
RUN \
  --mount=type=cache,sharing=locked,target=/var/cache/apt \
  --mount=type=cache,sharing=locked,target=/var/lib/apt/lists \
  set -eux; \
  apt-get install -y --no-install-recommends \
  bind9-dnsutils \
  iputils-ping; \
  curl -fsSLO https://github.com/watchexec/watchexec/releases/download/v${WATCHEXEC_VERSION}/watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-gnu.deb; \
  dpkg -i watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-gnu.deb; \
  rm -f watchexec-${WATCHEXEC_VERSION}-x86_64-unknown-linux-gnu.deb;

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun

RUN ln -s /usr/local/bin/bun /usr/local/bin/bunx

USER ${USER}

WORKDIR /app

FROM base_development AS redis_test

CMD ["watchexec", "--exts", "js,json,ts,tsx", "-r", "-w", "src", "-w", "package.json", "--", "bun", "run", "src/redis-test"]
