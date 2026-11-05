# Measuring AI visibility

## Monthly citation check (30 minutes)

1. Keep a fixed list of about 15 questions: brand questions ("who is Brand"), service questions
   ("freight forwarder Frankfurt dangerous goods") and how-to questions ("how to calculate air
   freight chargeable weight").
2. Ask each question in ChatGPT (search on), Claude (web search on), Perplexity, Google AI Mode
   and Copilot, logged out or in a clean profile where possible.
3. Record per question and assistant: cited or not, which URL, and what it said about the business
   (wrong facts are worth fixing at the source).
4. Keep the first run as the baseline; compare monthly. Answers vary between runs, so look at trends
   over several months, not single results.

A spreadsheet with columns `date, assistant, question, cited (y/n), url, notes` is enough.

## Platform reports

- **Google Search Console:** the Generative AI performance reports (added June 2026, as recorded in
  this pack's source project). The "Search generative AI" setting includes the site by default.
- **Bing Webmaster Tools:** the AI Performance report (Copilot citations and the queries behind them).
- **Analytics:** referrals from `chatgpt.com`, `perplexity.ai`, `copilot.microsoft.com`,
  `gemini.google.com` and `claude.ai`, if the site has analytics.
- **Server or CDN logs:** requests from `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot` show
  the search bots can reach the site; on Vercel, the firewall's traffic view shows bots by name.

## When the site isn't cited

1. Is the page indexed in Google and Bing (URL inspection)?
2. Do `robots.txt` and the firewall let the AI search bots in (`robots-check.mjs`, firewall log)?
3. Is the answer in the HTML, in the first lines, with numbers?
4. Is the business described the same way across the site, Google Business Profile and directories?
5. Do other sites mention the business (directories, associations, partners, press)? Assistants
   lean on corroboration.
