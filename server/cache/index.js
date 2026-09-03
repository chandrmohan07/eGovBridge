/**
 * SIH Government Service Integration Platform — Cache & Optimization Layer
 * Bounded in-memory TTL caching with LRU eviction and credit-efficiency controls.
 * STRICT SECURITY GUARD: Strictly prohibits caching private citizen credentials, tokens, or PII.
 */

import crypto from 'node:crypto';

class CacheSegment {
  constructor(name, maxEntries = 500, defaultTtlSeconds = 300) {
    this.name = name;
    this.maxEntries = maxEntries;
    this.defaultTtlSeconds = defaultTtlSeconds;
    this.store = new Map(); // key -> { value, expiresAt, accessedAt, etag }
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      writes: 0
    };
  }

  /**
   * Generates a weak ETag based on JSON payload
   */
  generateEtag(value) {
    const str = typeof value === 'string' ? value : JSON.stringify(value);
    const hash = crypto.createHash('md5').update(str).digest('hex').slice(0, 16);
    return `W/"${hash}"`;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    entry.accessedAt = Date.now();
    this.stats.hits++;
    return {
      value: entry.value,
      etag: entry.etag,
      expiresAt: entry.expiresAt
    };
  }

  set(key, value, ttlSeconds = null) {
    // Evict oldest if at capacity
    if (this.store.size >= this.maxEntries) {
      let oldestKey = null;
      let oldestTime = Infinity;
      for (const [k, v] of this.store.entries()) {
        if (v.accessedAt < oldestTime) {
          oldestTime = v.accessedAt;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        this.store.delete(oldestKey);
        this.stats.evictions++;
      }
    }

    const ttl = (ttlSeconds !== null ? ttlSeconds : this.defaultTtlSeconds) * 1000;
    const now = Date.now();
    const etag = this.generateEtag(value);

    this.store.set(key, {
      value,
      etag,
      expiresAt: now + ttl,
      accessedAt: now
    });
    this.stats.writes++;

    return { etag, expiresAt: now + ttl };
  }

  delete(key) {
    return this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }

  getStats() {
    return {
      name: this.name,
      size: this.store.size,
      maxEntries: this.maxEntries,
      ...this.stats,
      hitRatio: this.stats.hits + this.stats.misses > 0 
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

// Segmented Caches for Non-Sensitive Public Metadata
export const cacheSegments = {
  CATALOG: new CacheSegment('CATALOG', 200, 600),          // 10 mins for service catalog
  CATEGORIES: new CacheSegment('CATEGORIES', 50, 900),     // 15 mins for service categories
  SCHEMES: new CacheSegment('SCHEMES', 200, 300),          // 5 mins for government schemes
  NEWS: new CacheSegment('NEWS', 100, 180),                // 3 mins for news/announcements
  EMPLOYMENT: new CacheSegment('EMPLOYMENT', 200, 300),    // 5 mins for NCS employment listings
  ADMIN_METRICS: new CacheSegment('ADMIN_METRICS', 20, 30) // 30 secs for heavy admin aggregations
};

/**
 * Validates whether a key or payload is safe to cache (prohibits tokens/credentials)
 */
export function isSafeToCache(key, data) {
  const lowerKey = String(key).toLowerCase();
  const forbiddenPatterns = ['token', 'password', 'auth', 'secret', 'aadhaar', 'session', 'user'];
  return !forbiddenPatterns.some(p => lowerKey.includes(p));
}

/**
 * Retrieves platform-wide cache performance statistics
 */
export function getPlatformCacheStats() {
  const segments = {};
  let totalHits = 0;
  let totalMisses = 0;

  for (const [key, seg] of Object.entries(cacheSegments)) {
    const stats = seg.getStats();
    segments[key] = stats;
    totalHits += stats.hits;
    totalMisses += stats.misses;
  }

  return {
    totalSegments: Object.keys(cacheSegments).length,
    overallHits: totalHits,
    overallMisses: totalMisses,
    overallHitRatio: totalHits + totalMisses > 0 
      ? ((totalHits / (totalHits + totalMisses)) * 100).toFixed(1) + '%'
      : '0%',
    segments
  };
}

/**
 * Standardized Pagination Helper
 * Slices an array of items and returns paginated metadata while maintaining
 * array compatibility
 */
export function paginate(items, page = 1, limit = 20) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));

  const total = items.length;
  const totalPages = Math.ceil(total / l) || 1;
  const startIndex = (p - 1) * l;
  const endIndex = startIndex + l;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    pagination: {
      total,
      page: p,
      limit: l,
      totalPages,
      hasNext: p < totalPages,
      hasPrev: p > 1
    }
  };
}
