# Redirects on Vercel

Checked against Vercel's documentation on 5 November 2026.

## In vercel.json (the usual way)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "trailingSlash": true,
  "redirects": [
    { "source": "/air-cargo", "destination": "/services/air-freight/", "statusCode": 301 },
    { "source": "/post/:slug", "destination": "/blog/", "permanent": true },
    {
      "source": "/:path*",
      "has": [{ "type": "host", "value": "my-project\\.vercel\\.app" }],
      "destination": "https://www.example.com/:path*",
      "permanent": true
    }
  ]
}
```

- `permanent: true` answers **308**, `permanent: false` 307, and `statusCode: 301` sets 301 explicitly.
- `trailingSlash: true` redirects `/about` → `/about/` with 308 (paths with a file extension don't
  redirect); `false` does the reverse. `cleanUrls: true` redirects `/about.html` → `/about` with 308.
- `source` uses path-to-regexp patterns (`:slug`, `:path*`, `(\\d{1,})`). Redirects run before rewrites.
- The host-scoped rule sends the project's own production `*.vercel.app` domain to the real domain.
  Name that exact host: a pattern for all of `.vercel.app` would also catch preview deployments.

## The legacy `routes` format

Projects that need routes (host-based headers, firewall `mitigate` rules) use `routes`, which
cannot be combined with `redirects`, `rewrites`, `headers`, `cleanUrls` or `trailingSlash`:

```json
{ "src": "^/air-cargo/?$", "status": 301, "headers": { "Location": "/services/air-freight/" } },
{ "src": "^/((?:[^/]+/)*)index\\.html$", "status": 308, "headers": { "Location": "/$1" } },
{ "src": "^/((?:[^/]+/)*[^/.]+)$", "status": 308, "headers": { "Location": "/$1/" } }
```

- Anchor every pattern with `^` and `$`.
- Route sources are compiled as JavaScript regular expressions: inline flags such as `(?i)` fail
  the deployment. Test each pattern with `new RegExp()` in the script that writes the file.
- Put old-URL redirects before the generic slash rules, so they win.

## Large maps: bulk redirects

For thousands of URLs, use Vercel's bulk redirects instead of `vercel.json` (Vercel CLI 50.1.0 or
later for the full command set):

```bash
vercel redirects upload my-redirects.csv     # stage a CSV
vercel redirects ls                           # list
vercel redirects promote <version-id>         # make the staged version live
vercel redirects add /old-path /new-path --status 301
```

Check the current limits and CSV format in Vercel's bulk-redirects documentation before a large upload.

## Keep it generated

When the redirect list lives in a project script that writes `vercel.json`, change the script
and run it; never edit the output by hand.
