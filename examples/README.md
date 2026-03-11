# api-invoke examples

Runnable examples demonstrating each feature of `api-invoke`.

## Prerequisites

- Node.js >= 18
- Internet connection (examples call real APIs)

## Setup

Build the library first (one-time):

```bash
npm run build
```

## Running

From the `api-invoke/` directory:

```bash
npx tsx examples/01-quick-start.ts
```

## Examples

| File | What it shows | API |
|------|--------------|-----|
| [01-quick-start.ts](01-quick-start.ts) | Parse a spec, discover operations, execute a call | Cleveland Museum of Art |
| [02-raw-url.ts](02-raw-url.ts) | Call any URL with no spec (`executeRaw` + raw-URL client) | JSONPlaceholder |
| [03-parser-executor.ts](03-parser-executor.ts) | Use parser and executor separately (YAML spec) | Postcodes.io |
| [04-discover-operations.ts](04-discover-operations.ts) | Browse operations, parameters, and auth schemes | National Weather Service |
| [05-authentication.ts](05-authentication.ts) | Bearer, Basic, API key, OAuth2, and Cookie auth lifecycle | HTTPBin |
| [06-error-handling.ts](06-error-handling.ts) | Error classification, `ErrorKind`, non-throwing mode | HTTPBin |
| [07-middleware.ts](07-middleware.ts) | Retry, logging, and custom middleware | HTTPBin |
| [browser/index.html](browser/index.html) | Browser usage with CORS proxy middleware | JokeAPI |

## Browser example

After building, either open `browser/index.html` directly or serve the project:

```bash
npx serve .
```

Then navigate to `http://localhost:3000/examples/browser/`.

## Notes

- All Node.js examples use free, public APIs — no API keys required
- Examples import from `'api-invoke'` via Node.js self-referencing (resolves to `dist/` after build)
- The browser example uses a public CORS proxy (`corsproxy.io`) which may have rate limits or downtime
