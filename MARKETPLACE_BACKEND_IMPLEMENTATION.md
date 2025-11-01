# 🏪 Cartae Marketplace Backend - Implementation Plan

**Phase:** Sprint 4 (Session 11)
**Status:** In Progress
**Created:** 1 Novembre 2025

---

## 📊 Overview

```
Frontend (React)                    Backend (Hono + Cloudflare)        Database (Supabase)
     │                                       │                                  │
     ├─ LIST plugins         ────────>  GET /api/v1/plugins       ──────> plugins table
     │                                       │                                  │
     ├─ SEARCH plugins       ────────>  POST /api/v1/plugins/search ──> pg_tsvector
     │                                       │                                  │
     ├─ GET plugin details   ────────>  GET /api/v1/plugins/:id   ──────> plugin details
     │                                       │                                  │
     ├─ DOWNLOAD plugin      ────────>  GET /api/v1/plugins/:id/download ──> R2 Storage
     │                                       │                                  │
     ├─ VIEW ratings         ────────>  GET /api/v1/plugins/:id/ratings  ──> ratings table
     │                                       │                                  │
     └─ SUBMIT rating        ────────>  POST /api/v1/plugins/:id/ratings ──> ratings table
                                             │                                  │
                                    Analytics & Logging ──────────> events table
```

---

## 🎯 Architecture Decisions

### Framework Choice: Hono.js

**Why Hono (not Express):**

- ✅ Lightweight (~20kb vs Express ~50kb)
- ✅ Built for edge computing (Cloudflare Workers compatible)
- ✅ Native TypeScript support
- ✅ Excellent performance (10-50% faster)
- ✅ OpenAPI integration ready
- ✅ Minimal learning curve for Express developers

**Stack:**

```
Hono (framework)
├─ Hono Router (routing)
├─ Hono Middleware (cors, logger, cache)
├─ Zod (validation)
└─ Hono OpenAPI (documentation)

Supabase Client
├─ Query builder
├─ RPC functions
└─ Realtime subscriptions (future)

Cloudflare Workers (hosting)
├─ Serverless edge computing
├─ Built-in rate limiting
├─ Global CDN caching
└─ R2 integration
```

---

## 📁 Directory Structure

```
apps/api/
├── src/
│   ├── index.ts                    ← Main app entry point
│   ├── env.ts                      ← Environment validation (Zod)
│   ├── types/
│   │   ├── plugin.ts              ← Plugin type definitions
│   │   ├── rating.ts              ← Rating types
│   │   ├── response.ts            ← API response types
│   │   └── index.ts               ← Exports
│   ├── services/
│   │   ├── PluginService.ts       ← List, search, get plugins
│   │   ├── DownloadService.ts     ← Track downloads
│   │   ├── RatingService.ts       ← Manage ratings
│   │   ├── CacheService.ts        ← Cache management
│   │   ├── RateLimiterService.ts  ← Rate limiting
│   │   ├── AnalyticsService.ts    ← Event tracking
│   │   └── index.ts               ← Exports
│   ├── middleware/
│   │   ├── error-handler.ts       ← Error handling
│   │   ├── rate-limiter.ts        ← Global rate limiting
│   │   ├── request-logger.ts      ← Request logging
│   │   ├── auth.ts                ← Authentication
│   │   └── cache-control.ts       ← Cache headers
│   ├── routes/
│   │   ├── plugins.ts             ← GET /api/v1/plugins*
│   │   ├── ratings.ts             ← POST /api/v1/ratings*
│   │   ├── admin.ts               ← POST /api/v1/admin*
│   │   ├── health.ts              ← GET /api/v1/health
│   │   └── index.ts               ← Exports
│   ├── utils/
│   │   ├── validation.ts          ← Zod schemas
│   │   ├── errors.ts              ← Custom error classes
│   │   ├── logger.ts              ← Structured logging
│   │   └── cache-key.ts           ← Cache key generation
│   └── config/
│       ├── supabase.ts            ← Supabase client
│       ├── cloudflare.ts          ← Cloudflare bindings
│       └── constants.ts           ← App constants
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   │   ├── PluginService.test.ts
│   │   │   ├── RatingService.test.ts
│   │   │   └── ...
│   │   └── middleware/
│   │       ├── rate-limiter.test.ts
│   │       └── ...
│   ├── e2e/
│   │   ├── plugins.spec.ts        ← End-to-end tests
│   │   ├── ratings.spec.ts
│   │   └── admin.spec.ts
│   └── fixtures/
│       ├── plugins.json
│       └── responses.json
├── wrangler.toml                   ← Cloudflare Workers config
├── tsconfig.json                   ← TypeScript config
├── vitest.config.ts                ← Test config
├── playwright.config.ts            ← E2E test config
└── package.json

Root workspace:
├── pnpm-workspace.yaml             ← Include @cartae/api
└── turbo.json                       ← Add api to build pipeline
```

---

## 🔧 Core Services Implementation Plan

### 1. PluginService

**File:** `src/services/PluginService.ts`

**Methods:**

```typescript
class PluginService {
  // List all plugins with pagination
  async listPlugins(filters: ListPluginsFilter): Promise<PaginatedResponse<Plugin>>;

  // Get plugin details by ID
  async getPlugin(id: string): Promise<Plugin>;

  // Search plugins with full-text search
  async searchPlugins(query: string, filters: SearchFilter): Promise<PaginatedResponse<Plugin>>;

  // Get featured plugins
  async getFeaturedPlugins(): Promise<FeaturedResponse>;

  // Check for plugin updates
  async checkUpdates(installed: PluginVersion[]): Promise<UpdateResponse[]>;

  // Get plugin download history
  async getDownloadStats(id: string, days?: number): Promise<DownloadStats>;

  // Private: Validate plugin integrity
  private async validatePlugin(id: string): Promise<boolean>;
}
```

**Data Sources:**

- Registry: Supabase `plugins` table + full-text search index
- Metadata: Supabase cached queries
- Cache: Cloudflare KV for immediate access

**Complexity:** Medium

- Full-text search requires Postgres tsvector setup
- Versioning needs careful handling
- Performance critical (most used endpoint)

---

### 2. DownloadService

**File:** `src/services/DownloadService.ts`

**Methods:**

```typescript
class DownloadService {
  // Record download event
  async recordDownload(pluginId: string, version: string, context: DownloadContext): Promise<void>;

  // Get download statistics
  async getDownloadStats(pluginId: string, timeframe: '7d' | '30d' | 'all'): Promise<Stats>;

  // Get top plugins by downloads
  async getTopPlugins(limit: number, timeframe: '7d' | '30d'): Promise<Plugin[]>;

  // Get trending plugins (growth rate)
  async getTrendingPlugins(limit: number): Promise<TrendingPlugin[]>;

  // Aggregate daily stats (batch operation)
  async aggregateDailyStats(date: string): Promise<void>;

  // Private: Deduplicate downloads (same IP, same version, < 1 min)
  private async deduplicateDownload(context: DownloadContext): Promise<boolean>;
}
```

**Tracking Data:**

- Timestamp, IP address, User agent
- Plugin ID, version
- Referrer (if available)
- Request duration

**Database:**

- Write: Supabase `downloads` table
- Aggregate: Daily RPC function
- Query: Materialized view for performance

---

### 3. RatingService

**File:** `src/services/RatingService.ts`

**Methods:**

```typescript
class RatingService {
  // Submit new rating (moderation queue)
  async submitRating(pluginId: string, data: RatingSubmission): Promise<RatingResponse>;

  // Get ratings for plugin
  async getRatings(pluginId: string, filter: RatingFilter): Promise<PaginatedResponse<Rating>>;

  // Get rating statistics
  async getRatingStats(pluginId: string): Promise<RatingStats>;

  // Approve/reject rating (admin)
  async moderateRating(ratingId: string, approved: boolean): Promise<void>;

  // Reply to rating (author)
  async replyToRating(ratingId: string, reply: string): Promise<void>;

  // Mark rating helpful/unhelpful
  async markHelpful(ratingId: string, helpful: boolean): Promise<void>;

  // Get rating distribution
  async getRatingDistribution(pluginId: string): Promise<Distribution>;

  // Check rate limit
  async checkRateLimit(context: RateLimitContext): Promise<boolean>;
}
```

**Moderation:**

- New ratings go to approval queue
- Spam filter (duplicate content, patterns)
- Manual review by admins
- Auto-approve after first approval (trust system)

**Analytics:**

- Track helpful votes
- Monitor spam patterns
- Identify fake reviews

---

### 4. CacheService

**File:** `src/services/CacheService.ts`

**Methods:**

```typescript
class CacheService {
  // Get from cache with fallback
  async get<T>(key: string, fallback: () => Promise<T>, ttl: number): Promise<T>;

  // Set cache value
  async set(key: string, value: any, ttl: number): Promise<void>;

  // Invalidate cache entries
  async invalidate(pattern: string): Promise<void>;

  // Clear all cache (emergency)
  async clear(): Promise<void>;

  // Get cache statistics
  async getStats(): Promise<CacheStats>;
}
```

**Cache Layers:**

```
1. Edge Cache (Cloudflare Workers KV)
   - TTL: 5-24 hours
   - Auto-managed by Hono

2. Supabase Cache (pgsql)
   - Materialized views
   - 10-30 minute refresh

3. Application Cache (Memory)
   - Request-local cache
   - Fast response generation
```

**Cache Keys:**

```
plugins:list:{page}:{limit}:{sort}:{category}
plugins:{id}:details
plugins:{id}:ratings:{page}
plugins:{id}:stats
featured:list
trending:7d
search:{query}:{category}
```

---

### 5. RateLimiterService

**File:** `src/services/RateLimiterService.ts`

**Methods:**

```typescript
class RateLimiterService {
  // Check rate limit for endpoint
  async checkLimit(key: string, limit: number, window: number): Promise<RateLimitResult>;

  // Record request
  async recordRequest(key: string, weight: number = 1): Promise<void>;

  // Get remaining quota
  async getRemaining(key: string): Promise<number>;

  // Reset quota (admin)
  async reset(key: string): Promise<void>;
}
```

**Strategy:**

- Token bucket algorithm
- Sliding window with Redis-style approach
- Cloudflare Durable Objects for state

**Limits:**

```
GET /plugins           1000 req/hour per IP
GET /plugins/:id       500 req/hour per IP
POST /ratings          5 req/24h per IP+plugin
POST /report           3 req/24h per IP
POST /download         100 req/hour per IP
```

---

### 6. AnalyticsService

**File:** `src/services/AnalyticsService.ts`

**Methods:**

```typescript
class AnalyticsService {
  // Track event
  async trackEvent(event: AnalyticsEvent): Promise<void>;

  // Get plugin analytics
  async getPluginAnalytics(pluginId: string, range: DateRange): Promise<Analytics>;

  // Get system metrics
  async getSystemMetrics(range: DateRange): Promise<SystemMetrics>;

  // Generate report
  async generateReport(pluginId: string, range: DateRange): Promise<Report>;
}
```

**Events Tracked:**

- Plugin search
- Plugin view
- Download start/end
- Rating submission
- Error occurrence

**Aggregations:**

- Hourly: Download counts
- Daily: Search trends
- Weekly: Top plugins
- Monthly: Growth metrics

---

## 🔗 Dependencies & Integrations

### Supabase (Database)

**Tables Required:**

```sql
-- Plugins table
CREATE TABLE plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT,
  author TEXT,
  category TEXT,
  rating FLOAT,
  downloads INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  manifest JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX plugins_fts ON plugins
  USING GIN (to_tsvector('english', name || ' ' || description));

-- Ratings table
CREATE TABLE plugin_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id TEXT REFERENCES plugins(id),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  comment TEXT,
  author TEXT,
  email TEXT,
  status TEXT DEFAULT 'pending',
  helpful INT DEFAULT 0,
  unhelpful INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(plugin_id, email)
);

-- Downloads tracking
CREATE TABLE plugin_downloads (
  id BIGSERIAL PRIMARY KEY,
  plugin_id TEXT REFERENCES plugins(id),
  version TEXT,
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Events for analytics
CREATE TABLE analytics_events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT,
  plugin_id TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX downloads_plugin_id ON plugin_downloads(plugin_id);
CREATE INDEX downloads_created_at ON plugin_downloads(created_at);
CREATE INDEX analytics_plugin_id ON analytics_events(plugin_id);
```

**RPC Functions Required:**

```typescript
// Track download and update plugin stats
rpc.track_download(pluginId, version, ipAddress, userAgent)
  → Updates plugin.downloads counter

// Get download stats for date range
rpc.get_download_stats(pluginId, days)
  → Returns aggregated stats

// Moderate rating
rpc.moderate_rating(ratingId, approved)
  → Updates status and triggers cache invalidation

// Calculate rating average
rpc.calculate_rating_stats(pluginId)
  → Returns { avg: 4.5, count: 245, distribution: [...] }
```

### Cloudflare Workers

**Requirements:**

- Wrangler CLI configured
- KV namespace for rate limiting
- Environment variables (SUPABASE_URL, SUPABASE_KEY)

**wrangler.toml:**

```toml
name = "cartae-api"
main = "src/index.ts"
compatibility_date = "2025-11-01"

[env.production]
routes = [
  { pattern = "api.cartae.io/api/v1/*", zone_name = "cartae.io" }
]
vars = { ENVIRONMENT = "production" }

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_NAMESPACE_ID"

[[r2_buckets]]
binding = "PLUGIN_STORAGE"
bucket_name = "cartae-plugins"
```

---

## 📊 Implementation Timeline

### Week 1 (Sprint 4 - Phase 2)

- [ ] PluginService (list, get, search)
- [ ] DownloadService (tracking)
- [ ] RatingService (basic)
- [ ] CacheService

### Week 2 (Sprint 4 - Phase 3)

- [ ] Hono routes (all endpoints)
- [ ] Middleware (auth, rate limiting)
- [ ] Error handling
- [ ] API documentation

### Week 3 (Sprint 4 - Phase 4-5)

- [ ] Analytics integration
- [ ] Tests (unit + e2e)
- [ ] Performance optimization
- [ ] Deployment to Cloudflare

---

## ⚙️ Configuration Files Needed

### .env.local

```
VITE_API_URL=http://localhost:8787
SUPABASE_URL=https://...
SUPABASE_KEY=sk_live_...
SUPABASE_ADMIN_KEY=sk_admin_...
CLOUDFLARE_ACCOUNT_ID=...
CLOUDFLARE_API_TOKEN=...
```

### tsconfig.json (for API)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "lib": ["ES2020", "DOM"],
    "types": ["cloudflare"]
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests

- Service logic (mocked Supabase)
- Validation schemas
- Cache behavior
- Rate limiting logic

### E2E Tests

- Full request/response cycles
- Database integration
- Rate limit enforcement
- Error scenarios

### Load Testing

- 1000 req/sec throughput
- Cache hit ratio > 90%
- P99 latency < 200ms

---

## 📈 Success Metrics

| Metric           | Target  | Monitoring           |
| ---------------- | ------- | -------------------- |
| API Uptime       | 99.9%   | Cloudflare Analytics |
| Cache Hit Rate   | > 85%   | CloudFlare KV stats  |
| P50 Latency      | < 50ms  | Hono metrics         |
| P99 Latency      | < 200ms | Hono metrics         |
| Error Rate       | < 0.1%  | Supabase logs        |
| Rate Limit Abuse | < 5%    | Event tracking       |

---

**Next Steps:**

1. ✅ Define API spec (MARKETPLACE_API_SPEC.md)
2. ✅ Plan implementation (this document)
3. ⏳ Implement services
4. ⏳ Create routes
5. ⏳ Write tests
6. ⏳ Deploy to Cloudflare

**Updated:** 1 Novembre 2025
