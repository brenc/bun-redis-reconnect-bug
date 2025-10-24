import { RedisClient, sleep } from 'bun';

class RedisClientWrapper {
  private client: Bun.RedisClient;
  private customReconnect = false;
  private isClosed = false;
  private isReconnecting = false;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private redisClientOptions: Bun.RedisOptions;
  private url: string;

  constructor({
    customReconnect = false,
    redisClientOptions = {
      autoReconnect: true,
      connectionTimeout: 1000,
      maxRetries: 1000,
    },
    url = 'redis://test-redis-server:6379',
  }: {
    customReconnect?: boolean;
    redisClientOptions?: Bun.RedisOptions;
    url?: string;
  } = {}) {
    this.customReconnect = customReconnect;

    if (this.customReconnect) {
      // Disable built-in auto-reconnect if using custom logic
      redisClientOptions.autoReconnect = false;
    }

    this.redisClientOptions = redisClientOptions;
    this.url = url;
    this.client = this.createClient();

    console.log('Using custom reconnect logic:', this.customReconnect);
  }

  async connect() {
    await this.client.connect();
  }

  /** Create a new Redis client instance with event handlers
   * @returns A new RedisClient instance
   */
  private createClient(): RedisClient {
    console.log(`Redis client options: %O`, this.redisClientOptions);

    const client = new RedisClient(this.url, this.redisClientOptions);

    client.onclose = (err) => {
      console.error('Redis connection closed: %O', err);

      if (this.customReconnect) {
        this.scheduleReconnect();
      }
    };

    client.onconnect = () => {
      console.log('Connected to Redis server at', this.url);

      this.isReconnecting = false;

      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;

      setInterval(() => {
        console.log(
          `${new Date().toISOString()}: Redis connected: ${this.client.connected}`,
        );
      }, 1000);
    };

    return client;
  }

  async get(key: RedisClient.KeyLike) {
    return await this.client.get(key);
  }

  async set(key: RedisClient.KeyLike, value: RedisClient.KeyLike) {
    await this.client.set(key, value);
  }

  async close() {
    this.client.close();
    this.isClosed = true;
  }

  /** Schedule a reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.isClosed || this.reconnectTimer) {
      return;
    }

    console.log(`Scheduling reconnection to server at ${this.url} in 1 second`);

    this.isReconnecting = true;
    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect();
    }, 1000);
  }

  /** Attempt to reconnect to the Redis server
   */
  private async attemptReconnect(): Promise<void> {
    if (this.isClosed) {
      console.log('Connection is closed, not attempting reconnect');
      return;
    }

    try {
      console.log(`Attempting to reconnect to server at ${this.url}`);

      this.client = this.createClient();

      console.log('XXX BEFORE CONNECT XXX');
      await this.client.connect();
      console.log('XXX AFTER CONNECT XXX');

      console.log(`Successfully reconnected to Redis server at ${this.url}`);
    } catch (err) {
      console.log(
        'Reconnection attempt failed, will retry in 1 second: %O',
        err,
      );
      // Schedule another attempt
      this.reconnectTimer = undefined;
      this.scheduleReconnect();
    }
  }
}

async function testNativeReconnection() {
  const client = new RedisClientWrapper();
  await client.connect();
  // for (;;) {
  //   try {
  //     await client.set('test-key', 'test-value');
  //     console.log(
  //       'test-key should be test-value: %O',
  //       await client.get('test-key'),
  //     );
  //   } catch (err) {
  //     console.error('Error in testNativeReconnection:', err);
  //   }
  //   await sleep(1000);
  // }
}

async function testCustomReconnection() {
  const client = new RedisClientWrapper({ customReconnect: true });
  await client.connect();
  // for (;;) {
  //   try {
  //     await client.set('test-key', 'test-value');
  //     console.log(
  //       'test-key should be test-value: %O',
  //       await client.get('test-key'),
  //     );
  //   } catch (err) {
  //     console.error('Error in testCustomReconnection:', err);
  //   }
  //   await sleep(1000);
  // }
}

try {
  // await testCustomReconnection();
  await testNativeReconnection();
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
