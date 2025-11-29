/**
 * Caching Utilities for Performance Optimization
 *
 * Implements in-memory caching with TTL, LRU eviction, and invalidation strategies.
 * Reduces API calls and improves response times for frequently accessed data.
 *
 * Based on Section 8.4 of LOGISTICS_DOMAIN_ANALYSIS.md
 *
 * @module utils/performance/cache
 */

/**
 * Cache entry structure
 */
class CacheEntry {
  constructor(key, value, ttl) {
    this.key = key;
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = ttl ? Date.now() + ttl : null;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
  }

  isExpired() {
    return this.expiresAt && Date.now() > this.expiresAt;
  }

  touch() {
    this.lastAccessed = Date.now();
    this.accessCount++;
  }
}

/**
 * In-Memory Cache with TTL and LRU eviction
 */
export class MemoryCache {
  constructor(options = {}) {
    this.options = {
      maxSize: 1000, // Maximum number of entries
      defaultTTL: 300000, // 5 minutes default TTL
      cleanupInterval: 60000, // Cleanup expired entries every minute
      debug: false,
      ...options,
    };

    this.cache = new Map();
    this.cleanupTimer = null;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };

    if (this.options.cleanupInterval > 0) {
      this.startCleanup();
    }
  }

  /**
   * Gets a value from cache
   *
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   *
   * @example
   * const route = cache.get('route-123');
   * if (route) {
   *   console.log('Cache hit!');
   * }
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.log("MISS:", key);
      return undefined;
    }

    if (entry.isExpired()) {
      this.delete(key);
      this.stats.misses++;
      this.stats.expirations++;
      this.log("EXPIRED:", key);
      return undefined;
    }

    entry.touch();
    this.stats.hits++;
    this.log("HIT:", key);
    return entry.value;
  }

  /**
   * Sets a value in cache
   *
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   *
   * @example
   * cache.set('route-123', routeData, 300000); // 5 minutes
   */
  set(key, value, ttl = this.options.defaultTTL) {
    // Check if we need to evict
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry = new CacheEntry(key, value, ttl);
    this.cache.set(key, entry);
    this.log("SET:", key, `(TTL: ${ttl}ms)`);
  }

  /**
   * Checks if key exists and is not expired
   *
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.isExpired()) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Deletes a key from cache
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.log("DELETE:", key);
    }
    return deleted;
  }

  /**
   * Clears all cache entries
   */
  clear() {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0,
    };
    this.log("CLEAR: All entries removed");
  }

  /**
   * Gets or sets a value (cache-aside pattern)
   *
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch value if not cached
   * @param {number} ttl - Time to live
   * @returns {Promise<*>} Cached or fetched value
   *
   * @example
   * const route = await cache.getOrSet(
   *   'route-123',
   *   () => api.get('/routes/123'),
   *   300000
   * );
   */
  async getOrSet(key, fetchFn, ttl = this.options.defaultTTL) {
    const cached = this.get(key);

    if (cached !== undefined) {
      return cached;
    }

    this.log("FETCH:", key);
    const value = await fetchFn();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Evicts least recently used entry
   * @private
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.log("EVICT:", oldestKey);
    }
  }

  /**
   * Removes expired entries
   * @private
   */
  cleanup() {
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.isExpired()) {
        this.cache.delete(key);
        this.stats.expirations++;
        removedCount++;
      }
    }

    if (removedCount > 0) {
      this.log("CLEANUP: Removed", removedCount, "expired entries");
    }
  }

  /**
   * Starts automatic cleanup
   * @private
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * Stops automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Gets cache statistics
   *
   * @returns {object} Statistics object
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate =
      total > 0 ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      expirations: this.stats.expirations,
      hitRate: `${hitRate}%`,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Estimates memory usage (rough approximation)
   * @private
   */
  estimateMemoryUsage() {
    let totalSize = 0;

    for (const entry of this.cache.values()) {
      // Rough estimate: 100 bytes per entry + JSON size
      totalSize += 100 + JSON.stringify(entry.value).length;
    }

    if (totalSize < 1024) {
      return `${totalSize} B`;
    } else if (totalSize < 1024 * 1024) {
      return `${(totalSize / 1024).toFixed(2)} KB`;
    } else {
      return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  /**
   * Logs debug messages
   * @private
   */
  log(...args) {
    if (this.options.debug) {
      console.log("[Cache]", ...args);
    }
  }

  /**
   * Destroys the cache instance
   */
  destroy() {
    this.stopCleanup();
    this.clear();
  }
}

/**
 * Cache invalidation strategies
 */
export class CacheInvalidator {
  constructor(cache) {
    this.cache = cache;
    this.patterns = new Map(); // Pattern -> Set of keys
  }

  /**
   * Registers a key with pattern tags
   *
   * @param {string} key - Cache key
   * @param {string[]} tags - Pattern tags
   *
   * @example
   * invalidator.register('route-123', ['route', 'lab-456']);
   */
  register(key, tags) {
    tags.forEach((tag) => {
      if (!this.patterns.has(tag)) {
        this.patterns.set(tag, new Set());
      }
      this.patterns.get(tag).add(key);
    });
  }

  /**
   * Invalidates all keys matching a tag
   *
   * @param {string} tag - Pattern tag
   * @returns {number} Number of keys invalidated
   *
   * @example
   * // Invalidate all route caches for a specific lab
   * invalidator.invalidate('lab-456');
   */
  invalidate(tag) {
    const keys = this.patterns.get(tag);

    if (!keys) {
      return 0;
    }

    let count = 0;
    keys.forEach((key) => {
      if (this.cache.delete(key)) {
        count++;
      }
    });

    this.patterns.delete(tag);
    return count;
  }

  /**
   * Invalidates keys matching a pattern
   *
   * @param {RegExp} pattern - Regular expression pattern
   * @returns {number} Number of keys invalidated
   *
   * @example
   * // Invalidate all route caches
   * invalidator.invalidatePattern(/^route-/);
   */
  invalidatePattern(pattern) {
    let count = 0;

    for (const key of this.cache.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Clears all registrations
   */
  clear() {
    this.patterns.clear();
  }
}

/**
 * Multi-level cache (Memory + LocalStorage)
 */
export class MultiLevelCache {
  constructor(options = {}) {
    this.memoryCache = new MemoryCache({
      maxSize: 500,
      defaultTTL: 300000, // 5 minutes
      ...options.memory,
    });

    this.options = {
      storagePrefix: "cache:",
      storageTTL: 3600000, // 1 hour for localStorage
      ...options,
    };
  }

  /**
   * Gets value from memory cache, falls back to localStorage
   *
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    // Try memory cache first (fast)
    let value = this.memoryCache.get(key);

    if (value !== undefined) {
      return value;
    }

    // Try localStorage (slower)
    value = this.getFromStorage(key);

    if (value !== undefined) {
      // Promote to memory cache
      this.memoryCache.set(key, value);
    }

    return value;
  }

  /**
   * Sets value in both memory and localStorage
   *
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} memoryTTL - Memory cache TTL
   * @param {number} storageTTL - Storage cache TTL
   */
  set(key, value, memoryTTL, storageTTL) {
    this.memoryCache.set(key, value, memoryTTL);
    this.setInStorage(key, value, storageTTL);
  }

  /**
   * Deletes key from both caches
   *
   * @param {string} key - Cache key
   */
  delete(key) {
    this.memoryCache.delete(key);
    this.deleteFromStorage(key);
  }

  /**
   * Gets value from localStorage
   * @private
   */
  getFromStorage(key) {
    try {
      const storageKey = this.options.storagePrefix + key;
      const item = localStorage.getItem(storageKey);

      if (!item) {
        return undefined;
      }

      const { value, expiresAt } = JSON.parse(item);

      if (expiresAt && Date.now() > expiresAt) {
        this.deleteFromStorage(key);
        return undefined;
      }

      return value;
    } catch (error) {
      console.error("[MultiLevelCache] Storage read error:", error);
      return undefined;
    }
  }

  /**
   * Sets value in localStorage
   * @private
   */
  setInStorage(key, value, ttl = this.options.storageTTL) {
    try {
      const storageKey = this.options.storagePrefix + key;
      const item = {
        value,
        expiresAt: ttl ? Date.now() + ttl : null,
      };
      localStorage.setItem(storageKey, JSON.stringify(item));
    } catch (error) {
      console.error("[MultiLevelCache] Storage write error:", error);
    }
  }

  /**
   * Deletes key from localStorage
   * @private
   */
  deleteFromStorage(key) {
    try {
      const storageKey = this.options.storagePrefix + key;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("[MultiLevelCache] Storage delete error:", error);
    }
  }

  /**
   * Clears both caches
   */
  clear() {
    this.memoryCache.clear();

    // Clear only items with our prefix
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.options.storagePrefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("[MultiLevelCache] Storage clear error:", error);
    }
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    const memoryStats = this.memoryCache.getStats();

    let storageSize = 0;
    let storageCount = 0;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.options.storagePrefix)) {
          storageCount++;
          storageSize += localStorage.getItem(key).length;
        }
      });
    } catch {
      // Ignore
    }

    return {
      memory: memoryStats,
      storage: {
        count: storageCount,
        size: `${(storageSize / 1024).toFixed(2)} KB`,
      },
    };
  }
}

/**
 * Request deduplication cache
 * Prevents duplicate concurrent requests for the same resource
 */
export class RequestDeduplicator {
  constructor() {
    this.pending = new Map(); // key -> Promise
  }

  /**
   * Wraps a request function with deduplication
   *
   * @param {string} key - Request key
   * @param {Function} requestFn - Async function to execute
   * @returns {Promise<*>} Request result
   *
   * @example
   * const route = await deduplicator.dedupe(
   *   'route-123',
   *   () => api.get('/routes/123')
   * );
   */
  async dedupe(key, requestFn) {
    // Return existing pending request
    if (this.pending.has(key)) {
      console.log(`[Deduplicator] Reusing pending request: ${key}`);
      return this.pending.get(key);
    }

    // Execute new request
    const promise = requestFn().finally(() => {
      // Clean up after completion
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clears all pending requests
   */
  clear() {
    this.pending.clear();
  }
}

// Create singleton instances
export const defaultCache = new MemoryCache({
  maxSize: 1000,
  defaultTTL: 300000,
  debug: false,
});

export const routeCache = new MemoryCache({
  maxSize: 500,
  defaultTTL: 300000,
  debug: false,
});

export const stopCache = new MemoryCache({
  maxSize: 2000,
  defaultTTL: 180000, // 3 minutes
  debug: false,
});

export const deduplicator = new RequestDeduplicator();

/**
 * Cache utilities
 */
export const CacheUtils = {
  MemoryCache,
  MultiLevelCache,
  CacheInvalidator,
  RequestDeduplicator,
  default: defaultCache,
  route: routeCache,
  stop: stopCache,
  dedupe: deduplicator,
};

export default CacheUtils;
