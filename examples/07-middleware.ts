/**
 * 07 — Middleware
 *
 * Compose middleware for logging, timing, and retry.
 * Note: `withRetry` is a fetch wrapper (passed via `options.fetch`),
 * while `logging` and custom middleware use `options.middleware`.
 * API: HTTPBin (no auth required)
 *
 * Run: npx tsx examples/07-middleware.ts
 */

import { createClient, withRetry, logging } from 'api-invoke'
import type { Middleware } from 'api-invoke'

// --- Custom middleware: request timing ---

const timing: Middleware = {
  name: 'timing',
  onRequest(url, init) {
    console.log(`  [timing] → ${init.method ?? 'GET'} ${url}`)
    return { url, init }
  },
  onResponse(response) {
    console.log(`  [timing] ← ${response.status} ${response.statusText}`)
    return response
  },
  onError(error) {
    console.log(`  [timing] ✗ ${error.message}`)
  },
}

// --- Part A: Logging + custom middleware ---

console.log('--- Logging + custom middleware ---\n')

const logs: string[] = []
const client = await createClient('http://httpbin.org/spec.json', {
  middleware: [
    logging({ log: (msg: string) => logs.push(msg) }),
    timing,
  ],
})

const result = await client.execute('get_get')
console.log(`\n  Status: ${result.status}`)
console.log(`  Log entries: ${logs.length}`)

// --- Part B: Retry (fetch wrapper) ---

console.log('\n--- withRetry (fetch wrapper) ---\n')

const retryClient = await createClient('http://httpbin.org/spec.json', {
  fetch: withRetry({
    maxRetries: 2,
    initialDelayMs: 500,
    onRetry(attempt, delayMs, status) {
      console.log(`  [retry] attempt ${attempt}, delay ${delayMs}ms, status ${status}`)
    },
  }),
  middleware: [timing], // middleware and retry can be combined
})

const retryResult = await retryClient.execute('get_get')
console.log(`\n  Status: ${retryResult.status} (no retries needed for 200)`)
