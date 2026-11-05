# Content that gets quoted

AI assistants quote pages that answer a question directly, show their numbers and name their
sources. These patterns also help ordinary search.

## Answer first

The first two sentences of a service or tool page answer its main question plainly:

> Chargeable weight is the greater of actual weight and volumetric weight. For air freight,
> 1 m³ counts as 166.67 kg (IATA 1:6000).

Then the details, the exceptions and the call to action.

## Show the rules and the numbers

- Calculators state their formula, factors and legal source, for example "ADR 2025, 1.1.3.6:
  category 1 × 50, 2 × 3, 3 × 1".
- Tables beat paragraphs for comparable facts (limits, sizes, prices, codes).
- Units and editions are explicit: "Incoterms® 2020", "IATA DGR 67th edition", "13.6 m trailer".

## FAQs from real questions

- 4–6 per service or tool page, from real enquiries and sales calls, answered on the page.
- Each answer stands alone (it may be quoted without the question) and links to the related page.
- Mark them up with `FAQPage` (see `structured-data`).

## Freshness

- Pages built on yearly rules (regulations, standards, prices) show a visible "Updated" date that
  matches `dateModified` in the structured data and `lastmod` in the sitemap.
- Revise them when the rules change (for example the IATA DGR each January), then send IndexNow.

## Proof

- Short case pages: route, mode, constraint, outcome. Real numbers, with the client's permission.
- Certifications named with the certifying body; memberships with the organisation.
- Link the official source (UNECE, IATA, ICC, customs) where a page relies on it.

## Language and structure

- One topic per page, named in the `<h1>` and the title.
- Plain sentences; define jargon the first time (LDM, AWB, DGR).
- Headings that read like the questions people ask.
- Key text in the HTML, not in images, canvas or client-side-only components.
