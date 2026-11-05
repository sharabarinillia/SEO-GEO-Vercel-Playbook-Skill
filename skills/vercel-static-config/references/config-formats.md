# vercel.json formats

Checked against Vercel's documentation on 5 November 2026.

## Modern format

| Key | What it does |
|---|---|
| `trailingSlash: true` | `/about` → `/about/` with 308; paths with a file extension don't redirect. `false` does the reverse |
| `cleanUrls: true` | `/about.html` → `/about` with 308, and serves `about.html` at `/about` |
| `redirects` | `{ source, destination, permanent }`: `permanent: true` → 308, `false` → 307; `statusCode: 301` sets it explicitly. `has` / `missing` conditions on host, header, query, cookie |
| `headers` | `{ source, has?, headers: [{ key, value }] }`, path-to-regexp `source` (`/assets/(.*)`) |
| `rewrites` | Serve another path without changing the URL (rarely needed for static sites) |

Redirects run before rewrites. `has` with `type: "host"` takes a regex value (`"my-project\\.vercel\\.app"`).

Vercel also accepts `vercel.ts` (typed config with `@vercel/config`) with the same options.

## Legacy `routes` format

An ordered list; each route has `src` (a regular expression), and `status` + `headers.Location`
for redirects, `headers` + `continue: true` to add headers and keep matching, `has` conditions,
or `mitigate` for firewall rules.

- `routes` can't be combined with `redirects`, `rewrites`, `headers`, `cleanUrls` or `trailingSlash`.
- Order matters: deny rules first, then host headers, old-URL redirects, slash normalisation, then
  cache headers with `continue: true`.
- `src` is compiled as a JavaScript regular expression: no inline flags such as `(?i)`.
- Host conditions can use objects: `{ "type": "host", "value": { "suf": ".vercel.app" } }`.

The skill's `assets/vercel.routes.json` is the configuration of a production site, with its
old-URL list replaced by one example and a deny rule added.

## Firewall rules in vercel.json

Only in the `routes` format, and only the `deny` and `challenge` actions:

```json
{ "src": "^/(?:wp-|xmlrpc\\.php|\\.env|\\.git)|\\.(?:php|asp|aspx|sql|bak)$", "mitigate": { "action": "deny" } }
```

They ship with a deployment. Rules made in the dashboard or with `vercel firewall` (see the
`vercel-firewall` skill) apply without a deployment and offer more actions (log, rate limit,
redirect, bypass).

## Choosing

- New static site, no special needs: **modern format**.
- Need host-conditioned headers with `continue`, ordered regex routes, or deny rules in the
  repository: **routes format**, written by a script.
- Either way, if a script writes the file, the script is the source of truth.
