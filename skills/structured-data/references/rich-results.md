# Rich results: what to expect (notes as of November 2026)

Google decides per query whether to show a rich result, and its list of supported types changes.
Always check the [Search Gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
and [Search documentation updates](https://developers.google.com/search/updates) before promising one.

## Recorded changes

- **FAQ rich results** were limited to well-known government and health sites in 2023, and this
  pack's source project recorded that they stopped showing on 7 May 2026. FAQPage markup still
  describes the page and does no harm.
- **HowTo rich results** were dropped in 2023.
- **Structured data is not required for Google's AI features** (AI Overviews, AI Mode); they use the
  normal index and snippets ([AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide), May 2026).

## Still worth marking up for a business site

| Type | Why |
|---|---|
| Organization / LocalBusiness | Logo, contact details and knowledge-panel facts; consistent entity data for AI assistants |
| BreadcrumbList | Breadcrumb trail in results |
| Product with offers or reviews | Price and rating snippets (real data only) |
| Article | Article features and dates |
| Event | Event listings |
| SoftwareApplication | App rich results (needs real ratings) |

## Testing

- [Rich Results Test](https://search.google.com/test/rich-results): what Google can show for a URL or code.
- [Schema Markup Validator](https://validator.schema.org/): schema.org validity for any type.
- Search Console → Enhancements: errors across the site after launch.
