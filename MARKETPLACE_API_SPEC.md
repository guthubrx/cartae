# 🏪 Cartae Marketplace - API REST Specification

**Statut:** Draft - Phase 1 (Sprint 4)
**Version:** 1.0
**Date:** 1 Novembre 2025

---

## 📋 Table des matières

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Endpoints](#endpoints)
4. [Response Formats](#response-formats)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Caching Strategy](#caching-strategy)

---

## 🎯 Overview

**Base URL (Production):** `https://api.cartae.io`
**Base URL (Development):** `http://localhost:3000`
**API Version:** `v1`
**Format:** JSON

**Health Check:**

```
GET /api/v1/health
Response: { status: "ok", timestamp: ISO8601 }
```

---

## 🔐 Authentication

### Public Endpoints (No Auth Required)

- `GET /api/v1/plugins`
- `GET /api/v1/plugins/:id`
- `GET /api/v1/plugins/:id/download`
- `GET /api/v1/plugins/:id/ratings`

### Authenticated Endpoints (Optional Token)

- `POST /api/v1/plugins/:id/ratings` (with rate limiting per IP)
- `POST /api/v1/plugins/:id/report`

### Admin Endpoints (Admin Token Required)

- `POST /api/v1/admin/plugins`
- `PUT /api/v1/admin/plugins/:id`
- `DELETE /api/v1/admin/plugins/:id`
- `PUT /api/v1/admin/ratings/:id/approve`

**Token Format:** Bearer token in `Authorization` header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📡 Endpoints

### 1️⃣ LIST PLUGINS

```
GET /api/v1/plugins
```

**Query Parameters:**

- `page` (integer, default=1): Pagination page number
- `limit` (integer, default=20, max=100): Items per page
- `search` (string): Search by name/description
- `category` (string): Filter by category (teams, productivity, etc.)
- `sort` (string): Sort by `name`, `downloads`, `rating`, `created` (default=`downloads`)
- `order` (string): `asc` or `desc` (default=`desc`)
- `featured` (boolean): Show only featured plugins
- `verified` (boolean): Show only verified plugins

**Example Request:**

```
GET /api/v1/plugins?page=1&limit=20&category=productivity&sort=rating&order=desc
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "com.cartae.teams",
      "name": "Teams Collaboration",
      "description": "Real-time collaboration with Teams integration",
      "version": "2.1.0",
      "author": "Cartae Team",
      "category": "productivity",
      "icon": "https://r2.cartae.io/plugins/com.cartae.teams/icon.svg",
      "rating": 4.8,
      "ratingCount": 245,
      "downloads": 15420,
      "verified": true,
      "featured": true,
      "tags": ["teams", "collaboration", "productivity"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "pages": 8
  },
  "meta": {
    "timestamp": "2025-11-01T12:34:56Z",
    "cached": true,
    "cacheAge": 300
  }
}
```

---

### 2️⃣ GET PLUGIN DETAILS

```
GET /api/v1/plugins/:id
```

**Path Parameters:**

- `id` (string, required): Plugin ID (e.g., `com.cartae.teams`)

**Example Request:**

```
GET /api/v1/plugins/com.cartae.teams
```

**Response (200 OK):**

```json
{
  "data": {
    "id": "com.cartae.teams",
    "name": "Teams Collaboration",
    "description": "Real-time collaboration with Microsoft Teams integration for Cartae mindmaps",
    "longDescription": "# Teams Collaboration\n\nThis plugin enables...",
    "version": "2.1.0",
    "versions": [
      {
        "version": "2.1.0",
        "releaseDate": "2025-10-15T00:00:00Z",
        "changelog": "Fixed UI bugs and improved performance"
      },
      {
        "version": "2.0.0",
        "releaseDate": "2025-09-01T00:00:00Z",
        "changelog": "Major release with new collaboration features"
      }
    ],
    "author": "Cartae Team",
    "authorEmail": "plugins@cartae.io",
    "authorUrl": "https://cartae.io",
    "category": "productivity",
    "icon": "https://r2.cartae.io/plugins/com.cartae.teams/icon.svg",
    "banner": "https://r2.cartae.io/plugins/com.cartae.teams/banner.png",
    "screenshots": [
      "https://r2.cartae.io/plugins/com.cartae.teams/screenshot-1.png",
      "https://r2.cartae.io/plugins/com.cartae.teams/screenshot-2.png"
    ],
    "rating": 4.8,
    "ratingCount": 245,
    "downloads": 15420,
    "verified": true,
    "featured": true,
    "license": "MIT",
    "repositoryUrl": "https://github.com/cartae-team/plugin-teams",
    "tags": ["teams", "collaboration", "productivity"],
    "requirements": {
      "minVersion": "1.0.0",
      "permissions": ["read:teams", "write:mindmap"]
    },
    "stats": {
      "downloads30d": 1250,
      "downloads7d": 280,
      "active": 8902
    }
  },
  "meta": {
    "timestamp": "2025-11-01T12:34:56Z",
    "cached": true,
    "cacheAge": 600
  }
}
```

**Error Responses:**

- `404 Not Found`: Plugin doesn't exist
- `410 Gone`: Plugin was removed/deprecated

---

### 3️⃣ DOWNLOAD PLUGIN

```
GET /api/v1/plugins/:id/download
```

**Query Parameters:**

- `version` (string, default=latest): Specific version to download

**Example Request:**

```
GET /api/v1/plugins/com.cartae.teams/download?version=2.1.0
```

**Response (200 OK):**

```
Content-Type: application/zip
Content-Disposition: attachment; filename="com.cartae.teams-2.1.0.zip"
Content-Length: 2048576

[Binary ZIP file]
```

**Tracking:**

- Automatically records download in Supabase
- Increments `downloads` counter
- Tracks user agent, IP address (for analytics)

**Error Responses:**

- `404 Not Found`: Version doesn't exist
- `410 Gone`: Version removed
- `429 Too Many Requests`: Rate limit exceeded

---

### 4️⃣ GET PLUGIN RATINGS

```
GET /api/v1/plugins/:id/ratings
```

**Query Parameters:**

- `page` (integer, default=1): Pagination
- `limit` (integer, default=10, max=50): Items per page
- `sort` (string): `helpful`, `recent` (default=`helpful`)

**Example Request:**

```
GET /api/v1/plugins/com.cartae.teams/ratings?page=1&limit=10&sort=recent
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "rating-uuid-1",
      "rating": 5,
      "title": "Excellent plugin!",
      "comment": "Works perfectly with Teams integration...",
      "author": "John Doe",
      "helpful": 12,
      "unhelpful": 1,
      "createdAt": "2025-10-15T10:30:00Z",
      "replies": [
        {
          "id": "reply-uuid-1",
          "author": "Cartae Team",
          "comment": "Thank you for the feedback!",
          "createdAt": "2025-10-15T14:20:00Z"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 245,
    "pages": 25
  }
}
```

---

### 5️⃣ SUBMIT RATING

```
POST /api/v1/plugins/:id/ratings
```

**Headers:**

- `Content-Type: application/json`

**Request Body:**

```json
{
  "rating": 5,
  "title": "Excellent plugin!",
  "comment": "Works perfectly with Teams integration.",
  "author": "John Doe",
  "email": "john@example.com"
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "rating-uuid-new",
    "status": "pending",
    "message": "Your rating will be reviewed and published within 24 hours"
  }
}
```

**Rate Limiting:**

- Max 5 ratings per IP/plugin per 24 hours
- Requires email verification (optional)
- Moderation queue (manual approval)

**Error Responses:**

- `400 Bad Request`: Invalid rating (not 1-5)
- `429 Too Many Requests`: Rate limit exceeded
- `422 Unprocessable Entity`: Duplicate rating from IP

---

### 6️⃣ REPORT PLUGIN

```
POST /api/v1/plugins/:id/report
```

**Request Body:**

```json
{
  "type": "malware|spam|inappropriate|broken",
  "description": "The plugin contains suspicious code...",
  "email": "reporter@example.com"
}
```

**Response (201 Created):**

```json
{
  "data": {
    "id": "report-uuid",
    "status": "received",
    "message": "Thank you for reporting. Our team will review this."
  }
}
```

**Rate Limiting:**

- Max 3 reports per IP per 24 hours
- Moderation team notified immediately

---

### 7️⃣ CHECK UPDATES

```
POST /api/v1/plugins/updates
```

**Request Body:**

```json
{
  "installed": [
    {
      "id": "com.cartae.teams",
      "version": "2.0.0"
    },
    {
      "id": "com.cartae.anki",
      "version": "1.5.2"
    }
  ]
}
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "com.cartae.teams",
      "currentVersion": "2.0.0",
      "latestVersion": "2.1.0",
      "updateAvailable": true,
      "changelog": "Fixed UI bugs and improved performance",
      "downloadUrl": "https://api.cartae.io/api/v1/plugins/com.cartae.teams/download?version=2.1.0"
    },
    {
      "id": "com.cartae.anki",
      "currentVersion": "1.5.2",
      "latestVersion": "1.5.2",
      "updateAvailable": false
    }
  ]
}
```

---

### 8️⃣ SEARCH PLUGINS (Advanced)

```
GET /api/v1/plugins/search
```

**Query Parameters:**

- `q` (string): Full-text search query
- `category` (string, comma-separated): Filter by categories
- `minRating` (number, 0-5): Minimum rating
- `verified` (boolean): Only verified plugins
- `sort` (string): `relevance`, `rating`, `downloads` (default=`relevance`)

**Example Request:**

```
GET /api/v1/plugins/search?q=collaboration&category=productivity,teams&minRating=4&verified=true
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "id": "com.cartae.teams",
      "name": "Teams Collaboration",
      "relevance": 0.98,
      "...": "..."
    }
  ],
  "meta": {
    "query": "collaboration",
    "results": 12,
    "executionTime": 145
  }
}
```

---

### 9️⃣ GET FEATURED PLUGINS

```
GET /api/v1/plugins/featured
```

**Response (200 OK):**

```json
{
  "data": {
    "featured": [
      {
        "id": "com.cartae.teams",
        "name": "Teams Collaboration",
        "featured": true,
        "order": 1,
        "...": "..."
      }
    ],
    "trending": [
      {
        "id": "com.cartae.anki",
        "name": "Spaced Repetition",
        "downloads30d": 2500,
        "...": "..."
      }
    ]
  }
}
```

---

## ✅ Response Formats

### Success Response (2xx)

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2025-11-01T12:34:56Z",
    "version": "1.0",
    "cached": false
  }
}
```

### Error Response (4xx, 5xx)

```json
{
  "success": false,
  "error": {
    "code": "PLUGIN_NOT_FOUND",
    "message": "The requested plugin does not exist",
    "status": 404
  },
  "meta": {
    "timestamp": "2025-11-01T12:34:56Z",
    "requestId": "req-uuid-12345"
  }
}
```

---

## ⚠️ Error Handling

### HTTP Status Codes

| Code  | Meaning             | Example                        |
| ----- | ------------------- | ------------------------------ |
| `200` | Success             | Plugin retrieved               |
| `201` | Created             | Rating submitted               |
| `204` | No Content          | Update available check (empty) |
| `400` | Bad Request         | Invalid rating value           |
| `404` | Not Found           | Plugin doesn't exist           |
| `410` | Gone                | Plugin was removed             |
| `429` | Too Many Requests   | Rate limit exceeded            |
| `500` | Server Error        | Database error                 |
| `503` | Service Unavailable | Temporary outage               |

### Error Codes

```typescript
// Plugin-related
'PLUGIN_NOT_FOUND';
'PLUGIN_REMOVED';
'PLUGIN_DISABLED';
'VERSION_NOT_FOUND';

// Rating-related
'INVALID_RATING';
'RATING_DUPLICATE';
'RATING_LIMIT_EXCEEDED';

// General
'RATE_LIMIT_EXCEEDED';
'INVALID_REQUEST';
'INTERNAL_ERROR';
'SERVICE_UNAVAILABLE';
```

---

## 🚦 Rate Limiting

### Limits by Endpoint

| Endpoint           | Limit   | Window        | Note           |
| ------------------ | ------- | ------------- | -------------- |
| `GET /plugins`     | 1000/hr | Per IP        | Global         |
| `GET /plugins/:id` | 500/hr  | Per IP        | Cached heavily |
| `GET /download`    | 100/hr  | Per IP        | Prevents abuse |
| `POST /ratings`    | 5/24h   | Per IP+Plugin | Prevents spam  |
| `POST /report`     | 3/24h   | Per IP        | Prevents abuse |

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1635768896
Retry-After: 3600
```

### 429 Response Example

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "You have exceeded the rate limit. Try again in 1 hour.",
    "status": 429
  },
  "rateLimit": {
    "limit": 100,
    "remaining": 0,
    "reset": "2025-11-01T13:34:56Z"
  }
}
```

---

## 💾 Caching Strategy

### Cache Headers

| Endpoint                     | Cache-Control           | TTL    | Strategy    |
| ---------------------------- | ----------------------- | ------ | ----------- |
| `GET /plugins` (list)        | `public, max-age=300`   | 5 min  | Aggressive  |
| `GET /plugins/:id` (details) | `public, max-age=600`   | 10 min | Moderate    |
| `GET /plugins/:id/download`  | `public, max-age=86400` | 24h    | Immutable   |
| `GET /plugins/:id/ratings`   | `public, max-age=300`   | 5 min  | Moderate    |
| `POST` (all)                 | `no-cache`              | -      | Never cache |

### Invalidation Rules

```
Events that clear cache:

1. Plugin updated
   └─ Clear: /plugins, /plugins/:id

2. Rating submitted (after approval)
   └─ Clear: /plugins/:id, /plugins/:id/ratings

3. Downloads tracked
   └─ Update: /plugins/:id (stats only, via CDN purge)

4. Plugin removed
   └─ Clear: /plugins, /plugins/:id
```

### Supabase Cache Integration

- **Listing cache:** Supabase cached queries (5 min TTL)
- **Details cache:** Edge-side caching via Cloudflare
- **Download stats:** Eventual consistency (propagates in 5-10 min)
- **Ratings:** Async updates (approved ratings cache after 30 seconds)

---

## 📊 Analytics Tracked

### Per-Plugin Metrics

- `downloads_total`: Total downloads
- `downloads_30d`: Downloads last 30 days
- `downloads_7d`: Downloads last 7 days
- `active_users`: Active installations
- `rating_avg`: Average rating
- `rating_count`: Total ratings
- `report_count`: Total reports

### Per-Request Metrics

- Timestamp
- IP Address
- User Agent
- Plugin ID
- Version
- Request Duration
- Status Code
- Cache Status (hit/miss)

### Aggregations (Supabase RPC)

- Top plugins by downloads
- Trending plugins (24h growth)
- Most rated plugins
- New plugins (last 7 days)

---

**Document Status:** Draft
**Next Steps:** Implementation Phase 2 (Services Backend Core)
**Last Updated:** 1 Novembre 2025
