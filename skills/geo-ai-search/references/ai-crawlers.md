# AI and search crawlers

User-agent tokens as their operators document them (OpenAI, Anthropic and Perplexity pages
re-read on 5 November 2026). Operators add and rename bots, so open the linked page before
relying on a row.

| Operator | Token | Purpose | Recommended |
|---|---|---|---|
| Google | `Googlebot` | Google Search; AI Overviews and AI Mode use the same index | Allow |
| Google | `Google-Extended` | Not a crawler: a `robots.txt` token that controls use of content for Gemini models | Client's choice (doesn't affect Search) |
| Microsoft | `Bingbot` | Bing; Copilot answers come from the Bing index | Allow |
| Apple | `Applebot` | Spotlight, Siri and Safari suggestions | Allow |
| Apple | `Applebot-Extended` | Token controlling use for Apple's model training | Client's choice |
| DuckDuckGo | `DuckDuckBot` | DuckDuckGo search | Allow |
| OpenAI | `OAI-SearchBot` | Shows pages as sources in ChatGPT search | Allow |
| OpenAI | `ChatGPT-User` | Fetches a page a ChatGPT user asked about | Allow |
| OpenAI | `GPTBot` | Training data | Client's choice |
| Anthropic | `Claude-SearchBot` | Search results for Claude | Allow |
| Anthropic | `Claude-User` | Fetches a page a Claude user asked about | Allow |
| Anthropic | `ClaudeBot` | Training data | Client's choice |
| Perplexity | `PerplexityBot` | Perplexity's search index | Allow |
| Perplexity | `Perplexity-User` | Fetches a page a user asked about | Allow |
| Common Crawl | `CCBot` | Open web dataset used to train many models | Client's choice |
| Meta | `meta-externalagent` | AI training and indexing | Client's choice |

Sources: [OpenAI bots](https://developers.openai.com/api/docs/bots) ·
[Anthropic crawlers](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) ·
[Perplexity bots](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) ·
[Google crawlers](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) ·
[Applebot](https://support.apple.com/en-us/119829) ·
[Bingbot](https://www.bing.com/webmasters/help/which-crawlers-does-bing-use-8c184ec0) ·
[CCBot](https://commoncrawl.org/ccbot) ·
[Meta crawlers](https://developers.facebook.com/documentation/sharing/webmasters/web-crawlers)

## Notes

- **User-triggered fetchers** act for a person who asked about the page. OpenAI says `robots.txt`
  rules may not apply to ChatGPT-User; Perplexity says Perplexity-User generally ignores them;
  Anthropic says disallowing Claude-User stops those fetches. To stop a fetcher that ignores
  `robots.txt`, use a firewall rule.
- **Search opt-out:** OpenAI says sites that disallow OAI-SearchBot are not shown in ChatGPT search
  answers (they can still appear as navigational links). Anthropic says disallowing
  Claude-SearchBot may reduce a site's visibility in Claude's search results; Perplexity recommends
  allowing PerplexityBot for a site to appear in its results.
- **Blocking training bots doesn't remove a site from AI search** as long as the search bots are
  allowed. Blocking search bots does.
- **Verified bots:** Vercel's verified-bots directory includes the search and AI search bots above,
  and its Bot Protection ruleset doesn't challenge verified bots. Its separate AI Bots ruleset
  covers training, search and user-fetch bots alike, so its Deny setting blocks citations too.
- **Spoofing:** anyone can send a bot's user agent. Firewalls that verify bots by IP or signature
  block impostors; a 403 to a spoofed request says nothing about the real bot.

## robots.txt matching rules (RFC 9309, as Google applies them)

- A crawler obeys the group(s) naming its token (case-insensitive); only if none, the `*` group.
- Within the chosen rules, the longest matching path wins; on a tie, `Allow` wins.
- `*` matches any characters; a final `$` anchors the end of the URL.
- `/robots.txt` itself is always allowed. An empty `Disallow:` allows everything.
- A 404 for `robots.txt` means "crawl everything"; 5xx answers make Google crawl nothing for a while.
