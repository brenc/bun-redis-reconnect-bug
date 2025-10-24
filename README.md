# bun-redis-reconnect-bug

Run:
```bash
./up.ts
```

This will start a Redis server in Docker and run the Bun script that demonstrates the reconnect bug.

You'll see:
```
2025-10-24T00:21:35.588Z: Redis connected: true
```

Then, stop the Redis server container:
```bash
docker compose stop test-redis-server
```

You should see:
```
2025-10-24T00:22:39.653Z: Redis connected: false
```

After a short while, restart the Redis server container:
```bash
docker compose start test-redis-server
```

Client stays disconnected:
```
2025-10-24T00:23:52.475Z: Redis connected: false
```

There is no apparent attempt to reconnect.

When using custom reconnect logic, as demonstrated in the `testCustomReconnection` function, the client attempts to connect, but seems to hang:
```
Redis connection closed
Scheduling reconnection to server at redis://test-redis-server:6379 in 1 second
2025-10-24T00:27:25.386Z: Redis connected: false
test-redis-server-1 exited with code 0
Attempting to reconnect to server at redis://test-redis-server:6379
Redis client options: {
  autoReconnect: false,
  connectionTimeout: 1000,
  maxRetries: 1000,
}
XXX BEFORE CONNECT XXX
2025-10-24T00:27:26.386Z: Redis connected: false
```

No exception is raised on the connect attempt. It never seems to complete at all.
