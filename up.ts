#!/usr/bin/env bun

import { $ } from 'bun'

await $`docker compose up --build --remove-orphans -d`
await $`docker compose logs -f --tail=10`