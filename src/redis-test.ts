import { RedisClient } from 'bun';

const client = new RedisClient('redis://valkey:6379');

client.onclose = (() => {
  console.error('Redis connection closed');
});

client.onconnect = (() => {
  console.log('Connected to Redis');
  setInterval(() => {
    console.log(`Is connected: ${client.connected}`);
  }, 1000);
});

async function main() {
  await client.connect();
}

try {
  await main();
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}