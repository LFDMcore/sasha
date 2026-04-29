/* SASHA — ModelRouter
 * Routes requests to cheapest capable model.
 *   - Simple structured output (PPC, calendar): deepseek/deepseek-v4-flash
 *   - Complex strategic reasoning (page architecture): deepseek/deepseek-v4-pro
 * Caches all responses keyed by input hash.
 */

import { generateCompletion } from './DeepSeekClient.js';

// ---------------------------------------------------------------------------
// Simple in-memory LRU cache
// ---------------------------------------------------------------------------
const responseCache = new Map();
const CACHE_MAX = 200;

function hashInput(messages, options) {
  const raw = JSON.stringify({ messages, model: options.model });
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit int
  }
  return `h_${hash}_${raw.length}`;
}

function cached(key) {
  return responseCache.get(key);
}

function storeCache(key, value) {
  if (responseCache.size >= CACHE_MAX) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(key, value);
}

// ---------------------------------------------------------------------------
// Task complexity classification
// ---------------------------------------------------------------------------
const COMPLEX_REASONING_TASKS = new Set([
  'page-architecture',
  'competitive-attack',
  'strategy-doc'
]);

export function getModelForTask(taskType) {
  return COMPLEX_REASONING_TASKS.has(taskType)
    ? 'deepseek/deepseek-v4-pro'
    : 'deepseek/deepseek-v4-flash';
}

// ---------------------------------------------------------------------------
// Routed completion
// ---------------------------------------------------------------------------

/**
 * Route a completion request to the appropriate model.
 *
 * @param {string} taskType        — One of: 'page-architecture', 'ppc', 'calendar',
 *                                   'competitive-attack', 'strategy-doc', 'blog'
 * @param {Array}  messages        — OpenAI-style messages
 * @param {Object} options         — Overrides passed to generateCompletion
 * @param {boolean} options.skipCache  — If true, bypass cache
 * @returns {Promise<Object|string>}
 */
export async function routeCompletion(taskType, messages, options = {}) {
  const model = getModelForTask(taskType);
  const mergedOptions = { ...options, model };

  // Check cache unless skipped
  if (!mergedOptions.skipCache) {
    const key = hashInput(messages, mergedOptions);
    const hit = cached(key);
    if (hit !== undefined) {
      console.log(`[ModelRouter] Cache HIT for task "${taskType}" (${key.slice(0, 12)}...)`);
      return hit;
    }
  }

  console.log(`[ModelRouter] Routing "${taskType}" → ${model}`);
  const result = await generateCompletion(messages, mergedOptions);

  // Store in cache
  if (!mergedOptions.skipCache) {
    const key = hashInput(messages, mergedOptions);
    storeCache(key, result);
  }

  return result;
}

/**
 * Clear the response cache entirely.
 */
export function clearCache() {
  responseCache.clear();
  console.log('[ModelRouter] Cache cleared.');
}

/**
 * Get current cache size.
 */
export function cacheSize() {
  return responseCache.size;
}
