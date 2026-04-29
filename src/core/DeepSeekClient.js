/* SASHA — DeepSeek v4 Flash client via OpenRouter
 * Reusable fetch wrapper with retry, circuit breaker, and 529 handling.
 */

import { useEffect, useState, useCallback } from 'react';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// In-memory circuit breaker state
let circuitOpen = false;
let circuitFailureCount = 0;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_RESET_MS = 30_000;

function getApiKey() {
  const key = import.meta.env.VITE_OPENROUTER_KEY || '';
  if (!key) {
    console.warn('[DeepSeekClient] No VITE_OPENROUTER_KEY set — using fallback/demo key');
  }
  return key;
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
    parseJson = false
  } = options;

  if (circuitOpen) {
    throw new Error('[DeepSeekClient] Circuit breaker is OPEN — too many failures. Try again later.');
  }

  const apiKey = getApiKey();
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/lfdm/sasha',
          'X-Title': 'SASHA'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens
        })
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

      // Handle other non-OK
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`OpenRouter HTTP ${response.status}: ${body.slice(0, 200)}`);
      }

      // Success
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';

      // Reset circuit breaker on success
      circuitFailureCount = 0;
      circuitOpen = false;

      if (parseJson) {
        // Try to extract JSON from markdown code fences if needed
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
        return JSON.parse(jsonStr);
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
