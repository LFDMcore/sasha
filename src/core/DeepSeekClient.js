/* SASHA — DeepSeek v4 Flash client
 * Supports direct DeepSeek API (primary, for cache savings) and OpenRouter (fallback).
 *
 * Cache pricing (DeepSeek V4 direct):
 *   Cache hit:  $0.028/M input tokens  (5x cheaper)
 *   Cache miss: $0.14/M input tokens
 *   Output:     $0.28/M tokens
 *
 * Strategy: Use direct DeepSeek API by default for prefix cache hits.
 * Fall back to OpenRouter when DeepSeek is unavailable.
 */

import { useEffect, useState, useCallback } from 'react';

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// In-memory circuit breaker state
let circuitOpen = false;
let circuitFailureCount = 0;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30_000;
let useOpenRouter = false; // start with direct DeepSeek

function getApiKey() {
  // Support both Vite (import.meta.env) and Node.js (process.env)
  // Check runtime-provided key first (from user input in UI)
  if (typeof window !== 'undefined' && window.__SASHA_API_KEY) {
    return window.__SASHA_API_KEY;
  }
  const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
  
  // Try direct DeepSeek key first
  const deepseekKey = metaEnv.VITE_DEEPSEEK_API_KEY || process?.env?.VITE_DEEPSEEK_API_KEY || '';
  if (deepseekKey && !useOpenRouter) return deepseekKey;

  // Fall back to OpenRouter
  const orKey = metaEnv.VITE_OPENROUTER_KEY || process?.env?.VITE_OPENROUTER_KEY || '';
  if (orKey) return orKey;

  console.warn('[DeepSeekClient] No VITE_DEEPSEEK_API_KEY or VITE_OPENROUTER_KEY set');
  return '';
}

function getEndpoint() {
  if (useOpenRouter) return OPENROUTER_URL;
  return DEEPSEEK_URL;
}

function getHeaders(apiKey) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  // OpenRouter-specific headers
  if (useOpenRouter) {
    headers['HTTP-Referer'] = 'https://github.com/lfdm/sasha';
    headers['X-Title'] = 'SASHA';
  }
  return headers;
}

function getModelName(model) {
  // Map OpenRouter-style names to direct DeepSeek names
  const modelMap = {
    'deepseek/deepseek-v4-flash': 'deepseek-v4-flash',
    'deepseek/deepseek-v4-pro': 'deepseek-v4-pro',
    'deepseek-v4-flash': 'deepseek-v4-flash',
    'deepseek-v4-pro': 'deepseek-v4-pro',
  };
  return modelMap[model] || model;
}

/**
 * Wait helper
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a completion via OpenRouter (DeepSeek v4 Flash or Pro).
 *
 * @param {Array} messages   — OpenAI-style message array
 * @param {Object} options
 * @param {string} options.model      — Override model (default: deepseek/deepseek-v4-flash)
 * @param {number} options.temperature
 * @param {number} options.maxTokens
 * @param {boolean} options.parseJson — If true, attempts JSON.parse on content
 * @returns {Promise<Object|string>}
 */
export async function generateCompletion(messages, options = {}) {
  const {
    model = 'deepseek/deepseek-v4-flash',
    temperature = 0.3,
    maxTokens = 4096,
    parseJson = false,
    apiKey: optApiKey  // accept override from options
  } = options;

  if (circuitOpen) {
    throw new Error('[DeepSeekClient] Circuit breaker is OPEN — too many failures. Try again later.');
  }

  const apiKey = optApiKey || getApiKey();
  const endpoint = getEndpoint();
  const deepseekModel = getModelName(model);
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const body = {
        model: deepseekModel,
        messages,
        temperature,
        max_tokens: maxTokens
      };
      // Disable thinking for DeepSeek structured output — thinking tokens
      // compete with content for the max_tokens budget, causing truncation
      if (useOpenRouter) {
        // OpenRouter may not support extra_body; skip
      } else if (deepseekModel.startsWith('deepseek-')) {
        body.extra_body = { thinking: { type: 'disabled' } };
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getHeaders(apiKey),
        body: JSON.stringify(body)
      });

      // Handle 429 / 529 — backoff and retry
      if (response.status === 429 || response.status === 529) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        const backoff = retryAfter * 1000;
        console.warn(
          `[DeepSeekClient] Rate limited (${response.status}). ` +
          `Retrying in ${backoff}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await sleep(backoff);
        continue;
      }

      // Handle 401 — key invalid, try OpenRouter fallback
      if (response.status === 401 && !useOpenRouter) {
        console.warn('[DeepSeekClient] Direct DeepSeek auth failed — switching to OpenRouter fallback');
        useOpenRouter = true;
        // Retry this attempt with OpenRouter
        attempt--;
        continue;
      }

      // Handle other non-OK
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`API HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      // Success
      const data = await response.json();
      const message = data?.choices?.[0]?.message || {};
      const content = message.content || message.reasoning_content || '';

      // Reset circuit breaker on success
      circuitFailureCount = 0;
      circuitOpen = false;

      if (parseJson) {
        // Try to extract JSON from markdown code fences if needed
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        let jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
        
        // Fix common JSON issues: trailing commas, unterminated strings
        jsonStr = jsonStr
          .replace(/,(\s*[}\]])/g, '$1')  // remove trailing commas
          .replace(/,\s*$/, '')             // trailing comma after last element
          .replace(/(["\d])\s*\n\s*}/g, '$1\n}') // ensure proper closing};
        
        try {
          return JSON.parse(jsonStr);
        } catch (jsonErr) {
          // If JSON parsing fails, try to salvage by truncating at last complete object
          const lastBrace = jsonStr.lastIndexOf('}');
          if (lastBrace > 0) {
            try {
              return JSON.parse(jsonStr.substring(0, lastBrace + 1));
            } catch (e2) {
              // Totally unparseable — throw so caller falls back
              throw new Error(`JSON parse failed: ${jsonErr.message}. Content preview: ${content.substring(0, 100)}...`);
            }
          }
          throw jsonErr;
        }
      }

      return content;
    } catch (err) {
      lastError = err;
      circuitFailureCount++;
      console.error(`[DeepSeekClient] Attempt ${attempt + 1} failed:`, err.message);

      if (circuitFailureCount >= CIRCUIT_THRESHOLD) {
        circuitOpen = true;
        console.error(
          `[DeepSeekClient] Circuit breaker OPEN after ${circuitFailureCount} failures. ` +
          `Resetting in ${CIRCUIT_RESET_MS}ms.`
        );
        setTimeout(() => {
          circuitOpen = false;
          circuitFailureCount = 0;
          console.log('[DeepSeekClient] Circuit breaker reset.');
        }, CIRCUIT_RESET_MS);
      }

      if (attempt < maxRetries) {
        const backoff = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`[DeepSeekClient] Backoff ${backoff}ms then retry...`);
        await sleep(backoff);
      }
    }
  }

  throw lastError || new Error('[DeepSeekClient] All retries exhausted.');
}

/**
 * React hook: useDeepSeek
 * Manages loading/error states for one-shot or streaming calls.
 */
export function useDeepSeek() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const call = useCallback(async (messages, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateCompletion(messages, options);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { call, loading, error };
}
