# Cartae - Architecture Redis Cache + Queue

**Session 81c - Redis Cache + Queue**
**Date:** 15 Novembre 2025
**Status:** ✅ Complétée

---

## 📋 Vue d'Ensemble

Cette session implémente **Redis** pour:
- ✅ **Cache Layer** (cache-aside pattern, TTL, invalidation)
- ✅ **Job Queue** (BullMQ pour async processing)
- ✅ **Token Blacklist** (JWT revocation, session management)

**Objectif:** Performance + scalabilité + async processing

---

## 🏗️ Architecture Globale

```
┌─────────────────────────────────────────┐
│  APP ZONE (172.21.0.0/24)               │
│  ┌─────────────────┐  ┌──────────────┐  │
│  │  database-api   │→→│   Redis      │  │
│  │                 │  │              │  │
│  │  - CacheLayer   │  │  DB 0: Cache │  │
│  │  - JobQueue     │  │  DB 1: Queue │  │
│  │  - Blacklist    │  │  DB 2: BL    │  │
│  └─────────────────┘  └──────────────┘  │
│           ↓                              │
│  ┌─────────────────┐                    │
│  │  Workers        │                    │
│  │  - Email        │                    │
│  │  - Export       │                    │
│  │  - Sync         │                    │
│  │  - Cleanup      │                    │
│  └─────────────────┘                    │
└─────────────────────────────────────────┘
```

---

## 🔧 Configuration Redis

### Docker Compose (infra/docker/docker-compose.redis.yml)

```yaml
redis:
  image: redis:7-alpine
  command: redis-server
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
    --appendonly yes
    --notify-keyspace-events Ex
    --databases 16
  networks:
    - data-network  # Isolé APP zone uniquement
```

**Features:**
- Maxmemory: 512MB (LRU eviction)
- Persistence: RDB + AOF
- Keyspace notifications (expirations pour BullMQ)
- 16 databases (0=cache, 1=queue, 2=blacklist)

### redis.conf (infra/redis/redis.conf)

Configuration complète avec:
- Security (disable FLUSHDB/FLUSHALL/CONFIG)
- Persistence optimisée (RDB + AOF)
- Memory management (LRU, lazy freeing)
- Slow log monitoring

---

## 📦 Cache Layer (packages/database-api/src/cache/)

### RedisClient Wrapper

```typescript
import { RedisClient, getRedisClient } from './cache';

const redis = getRedisClient();

// Basic operations
await redis.set('user:123', { name: 'John' }, 300); // TTL 5min
const user = await redis.get<User>('user:123');
await redis.del('user:123');

// Batch operations
await redis.mset({ 'user:1': user1, 'user:2': user2 });
const users = await redis.mget<User>('user:1', 'user:2');

// Stats
const stats = redis.getStats();
console.log(`Hit rate: ${stats.hitRate}%`);
```

**Features:**
- Auto JSON serialization/deserialization
- TTL support
- Batch operations (MGET/MSET)
- Stats tracking (hits, misses, hit rate)
- Error handling + fallback

### Cache Decorators

```typescript
import { Cacheable, CacheEvict, CachePut } from './cache';

class UserService {
  @Cacheable({ ttl: 600, keyPrefix: 'user' })
  async getUser(id: string): Promise<User> {
    // 1er appel → DB query + cache write
    // 2ème appel → cache hit (no DB)
    return await db.users.findOne({ id });
  }

  @CacheEvict({ keyPrefix: 'user' })
  async updateUser(id: string, data: UserData) {
    // Après update → cache invalidé auto
    await db.users.update({ id }, data);
  }

  @CachePut({ ttl: 600, keyPrefix: 'user' })
  async createUser(data: UserData): Promise<User> {
    const user = await db.users.create(data);
    // Cached automatiquement après création
    return user;
  }
}
```

**Decorators:**
- `@Cacheable` - Cache-aside read (read from cache, fallback to DB)
- `@CacheEvict` - Invalidate cache after mutation
- `@CachePut` - Force cache write after mutation

---

## 🔄 Queue System (packages/database-api/src/queue/)

### QueueManager (BullMQ)

```typescript
import { QueueManager, getQueueManager } from './queue';

const queueManager = getQueueManager();

// Add jobs
await queueManager.addJob('email', 'send-welcome', {
  to: 'user@example.com',
  template: 'welcome',
});

await queueManager.addJob('export', 'csv-export', {
  userId: '123',
  type: 'transactions',
}, {
  priority: 1, // High priority
  delay: 5000, // Delay 5s
});

await queueManager.addJob('sync', 'office365-sync', {
  userId: '123',
  resource: 'calendar',
}, {
  attempts: 5,
  backoff: { type: 'exponential', delay: 2000 },
});
```

**Queues disponibles:**
- `email` - Notifications, invites, reports
- `export` - CSV, PDF, Excel exports
- `sync` - Office365, Gmail sync
- `cleanup` - Old tokens, sessions, logs

**Features:**
- Priority queues
- Delayed jobs
- Retry with exponential backoff
- Job persistence (completed/failed kept)

---

## 👷 Workers (Job Processing)

### Email Worker (example)

```typescript
import { Worker } from 'bullmq';

const emailWorker = new Worker('email', async (job) => {
  const { to, template, data } = job.data;

  switch (job.name) {
    case 'send-welcome':
      await sendEmail(to, 'Welcome to Cartae!', { ...data });
      break;

    case 'send-invite':
      await sendEmail(to, 'You have been invited', { ...data });
      break;

    default:
      throw new Error(`Unknown job: ${job.name}`);
  }
}, {
  connection: redisConnection,
  concurrency: 5, // 5 jobs en parallèle
});

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});
```

---

## 📊 Cache Policies (TTL par type)

### Recommandations TTL

| Type de données | TTL | Justification |
|-----------------|-----|---------------|
| **User profile** | 15 min | Change peu souvent |
| **User sessions** | 7 jours | Durée session JWT |
| **API responses** | 5 min | Data souvent volatile |
| **Static config** | 1 heure | Change rarement |
| **Search results** | 2 min | Data très volatile |
| **Token blacklist** | 7 jours | Durée JWT refresh |

### Invalidation Strategies

**1. Time-based (TTL)**
```typescript
await redis.set('user:123', user, 900); // 15min auto-expire
```

**2. Event-based (Decorator)**
```typescript
@CacheEvict({ keyPrefix: 'user' })
async updateUser(id: string) { ... } // Invalide après update
```

**3. Pattern-based (Bulk invalidation)**
```typescript
await redis.delPattern('user:*'); // Invalide tous users
```

**4. Manual**
```typescript
await redis.del('user:123', 'user:456'); // Invalide spécifiques
```

---

## 🔐 Token Blacklist (JWT Revocation)

### Usage

```typescript
import { RedisClient } from './cache';

const blacklist = new RedisClient({ db: 2, keyPrefix: 'bl:' });

// Blacklist token (logout, password change, etc.)
async function revokeToken(token: string, expiresIn: number) {
  await blacklist.set(token, { revoked: true }, expiresIn);
}

// Check if token is blacklisted
async function isTokenBlacklisted(token: string): Promise<boolean> {
  const revoked = await blacklist.get(token);
  return revoked !== null;
}

// Middleware JWT
async function jwtMiddleware(req, res, next) {
  const token = extractToken(req);

  if (await isTokenBlacklisted(token)) {
    return res.status(401).json({ error: 'Token revoked' });
  }

  next();
}
```

---

## 📈 Monitoring

### Health Checks

```typescript
// API endpoint /health
app.get('/health', async (req, res) => {
  const redis = getRedisClient();

  const isHealthy = await redis.ping();
  const stats = redis.getStats();

  res.json({
    redis: {
      status: isHealthy ? 'healthy' : 'unhealthy',
      hitRate: `${stats.hitRate.toFixed(2)}%`,
      hits: stats.hits,
      misses: stats.misses,
      errors: stats.errors,
    },
  });
});
```

### Metrics (Prometheus)

```typescript
import { register, Counter, Histogram } from 'prom-client';

const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
});

const cacheLatency = new Histogram({
  name: 'cache_latency_seconds',
  help: 'Cache operation latency',
});
```

### Redis Commander (DEV/STAGING)

Web UI pour explorer Redis en temps réel:
- URL: `http://redis.cartae.local`
- Login: `admin` / `${REDIS_COMMANDER_PASSWORD}`

---

## 🧪 Tests

### Cache Tests

```typescript
describe('RedisClient', () => {
  it('should cache and retrieve value', async () => {
    await redis.set('test:key', { foo: 'bar' }, 60);
    const value = await redis.get('test:key');
    expect(value).toEqual({ foo: 'bar' });
  });

  it('should expire after TTL', async () => {
    await redis.set('test:ttl', 'value', 1);
    await sleep(1500);
    const value = await redis.get('test:ttl');
    expect(value).toBeNull();
  });
});
```

### Queue Tests

```typescript
describe('QueueManager', () => {
  it('should add job to queue', async () => {
    const job = await queueManager.addJob('email', 'test', { foo: 'bar' });
    expect(job.id).toBeDefined();
  });
});
```

---

## 🚀 Déploiement

### 1. Start Redis

```bash
docker-compose -f infra/docker/docker-compose.networks.yml \
               -f infra/docker/docker-compose.base.yml \
               -f infra/docker/docker-compose.redis.yml \
               -f infra/docker/docker-compose.dev.yml up -d redis
```

### 2. Verify Redis

```bash
docker exec -it cartae-redis redis-cli ping
# PONG

docker exec -it cartae-redis redis-cli INFO
# Server info...
```

### 3. Start Workers (optionnel)

```bash
cd packages/database-api
npm run worker:email &
npm run worker:export &
npm run worker:sync &
```

---

## 📊 Résumé Session 81c

**LOC:** ~1,000 lignes
**Durée:** 4-6h
**Statut:** ✅ **COMPLÉTÉE**

**Livrables:**
1. ✅ Redis container (Docker Compose + config)
2. ✅ RedisClient wrapper (ioredis)
3. ✅ Cache decorators (@Cacheable, @CacheEvict, @CachePut)
4. ✅ QueueManager (BullMQ)
5. ✅ Cache policies (TTL recommendations)
6. ✅ Token blacklist (JWT revocation)
7. ✅ Monitoring (health checks, stats)
8. ✅ Documentation complète

**Impact:**
- ✅ Performance boost (cache hit rate 70-90% attendu)
- ✅ Async processing (emails, exports, sync)
- ✅ Scalabilité (horizontal scaling workers)
- ✅ JWT revocation (sécurité tokens)

**Prochaine Session:** 81d - Monitoring + Observability

---

**Auteur:** Claude Code
**Date:** 15 Novembre 2025
