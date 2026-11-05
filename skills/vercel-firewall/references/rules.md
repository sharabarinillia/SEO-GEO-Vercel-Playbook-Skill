# Custom rules, the CLI and the API

Checked against Vercel's documentation (CLI firewall reference, WAF custom rules, REST API) on
5 November 2026.

## The scanner rule

One rule, one condition, one regular expression (no flags or look-arounds, so any engine reads it):

```
^/(?:wp-|wordpress/|xmlrpc\.php|cgi-bin/|phpmyadmin|pma/|administrator/|\.env|\.git|\.svn|\.hg|\.aws|\.ssh|\.htaccess|\.htpasswd|\.DS_Store|\.vscode|\.idea)|\.(?:php|php5|php7|phtml|asp|aspx|jsp|jspx|cgi|cfm|sql|bak|old|swp|env|ini|log)$
```

`firewall-rules.mjs` builds it (`--keep` removes entries) and `--check-dist` / `--check-sitemap`
prove it matches none of the site's own paths. It allows `/.well-known/`, `/wp/`, `/blog/php-tips/`
and every normal page and asset.

## Vercel CLI

Run in the project folder after `vercel link`. Rules are staged as drafts until published.

```bash
vercel firewall rules add "Deny scanner paths" \
  --condition '{"type":"path","op":"re","value":"<pattern>"}' \
  --action deny --description "Scanner probes for files this static site doesn't have" --yes
vercel firewall publish --yes

vercel firewall rules list                    # managed bot rules + custom rules, drafts annotated
vercel firewall rules inspect "Deny scanner paths"
vercel firewall rules disable "Deny scanner paths" && vercel firewall publish --yes   # undo
vercel firewall overview                      # changes, traffic and alerts
vercel firewall status                        # configuration in evaluation order
vercel firewall traffic inspect path /wp-login.php --since 7d
```

`--condition` takes `{ "type", "op", "value", "key"?, "neg"? }`; several conditions are combined with
AND, `--or` starts a new group. Other actions: `challenge`, `log`, `bypass`, `rate_limit` (with
`--rate-limit-window`, `--rate-limit-requests`, `--rate-limit-keys`), `redirect`.

## REST API

`PATCH https://api.vercel.com/v1/security/firewall/config?projectId=<id>&teamId=<id>` with a bearer
token, one change per request:

```json
{
  "action": "rules.insert",
  "id": null,
  "value": {
    "name": "Deny scanner paths",
    "description": "Scanner probes for files this static site doesn't have",
    "active": true,
    "conditionGroup": [{ "conditions": [{ "type": "path", "op": "re", "value": "<pattern>" }] }],
    "action": { "mitigate": { "action": "deny", "rateLimit": null, "redirect": null, "actionDuration": null } }
  }
}
```

Other actions on the same endpoint: `rules.update`, `rules.remove`, `rules.priority`,
`managedRules.update` (for example `{ "action": "managedRules.update", "id": "bot_protection",
"value": { "active": true, "action": "challenge" } }`), `ip.insert`, `firewallEnabled`.
`PUT` replaces the whole configuration: avoid it unless you mean to.

## vercel.json

In the routes format only, with `deny` or `challenge`:

```json
{ "src": "<pattern>", "mitigate": { "action": "deny" } }
```

Put it first in `routes`. It ships with the next deployment; dashboard and CLI rules apply at once.

## Rate limiting (sites with forms or APIs)

```bash
vercel firewall rules add "Limit enquiry form" \
  --condition '{"type":"path","op":"eq","value":"/api/enquiry"}' \
  --condition '{"type":"method","op":"eq","value":"POST"}' \
  --action rate_limit --rate-limit-window 60 --rate-limit-requests 10 --rate-limit-keys ip \
  --rate-limit-action deny --yes
```

Check rate-limiting prices in Vercel's WAF pricing page before relying on it.

## Unused methods (optional)

Purely static sites only answer GET, HEAD and OPTIONS. `firewall-rules.mjs --methods` adds a rule
denying other methods; don't use it when the site posts forms or calls APIs on its own domain.
Check the rule in the dashboard after adding it.
