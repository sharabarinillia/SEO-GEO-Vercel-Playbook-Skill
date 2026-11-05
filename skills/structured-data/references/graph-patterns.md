# Graph patterns by page type

Nodes to add on top of the site-wide Organization and WebSite nodes (see
`assets/graph-template.json`). `jsonld-check.mjs` enforces the required properties marked **R**
and suggests the recommended ones (r).

## Contents

1. The business
2. Pages and breadcrumbs
3. Services and products
4. Articles
5. Free tools
6. FAQs and glossaries
7. Events and people
8. Generating the graph

## 1. The business

- **Organization**: name (r), url (r), logo (r), plus `sameAs` (LinkedIn, Google Business Profile,
  Wikipedia/Wikidata if they exist), `contactPoint`, `foundingDate`, `areaServed`, `knowsAbout`.
- **LocalBusiness** (or a subtype such as `ProfessionalService`, `MovingCompany`, `Store`) when
  customers visit or the business serves a local area: name **R**, address **R**, telephone (r),
  url (r), `openingHoursSpecification` (r, only when confirmed), `geo` (r, from the real address).
- Both types on one node (`"@type": ["Organization", "LocalBusiness"]`) is fine: one `@id`.
- Certifications: `hasCredential` with `EducationalOccupationalCredential` nodes naming the
  certifying body in `recognizedBy`. Memberships: `memberOf`.

## 2. Pages and breadcrumbs

- **WebPage** per page (AboutPage, ContactPage, CollectionPage for hubs): name (r), url (r),
  description, `inLanguage`, `isPartOf` → `#website`, `dateModified`, `about` → the page's main node.
- **BreadcrumbList** on inner pages: `itemListElement` **R**; each `ListItem` has `position`
  1, 2, 3 … in order, a `name`, and an `item` URL (the last item may leave it out).

## 3. Services and products

- **Service**: name (r), provider → `#org` (r), description (r), `serviceType`, `areaServed`,
  `offers` only with real prices.
- **Product**: name **R** and one of `offers`, `review`, `aggregateRating` **R** for product
  snippets. `offers` needs `price` and `priceCurrency`; reviews must be real and visible on the page.

## 4. Articles

**Article** / BlogPosting / NewsArticle: `headline`, `image`, `datePublished`, `dateModified`,
`author` (a Person or Organization with a name and url) are recommended. Keep `dateModified`
honest: only when the content changed.

## 5. Free tools

**WebApplication** (a SoftwareApplication subtype): name **R**, `applicationCategory` (r, e.g.
`BusinessApplication`), `offers` (r) with `"price": "0"` and `priceCurrency`, `operatingSystem`
(`"Any"`), `featureList` (what it does), `isAccessibleForFree: true`. Google's software app rich
result also wants ratings; free tools without real ratings simply won't get it, which is fine.

## 6. FAQs and glossaries

- **FAQPage**: `mainEntity` **R**, a list of `Question` nodes, each with `name` and
  `acceptedAnswer.text`. Only questions answered visibly on the page, from real customer questions.
- **DefinedTermSet** for glossaries and reference charts (Incoterms, UN numbers, categories): each
  `DefinedTerm` with `name`, `termCode`, `description`.

## 7. Events and people

- **Event**: name **R**, startDate **R** (ISO with time zone), location **R** (Place with address, or
  VirtualLocation), `eventStatus`, `offers`.
- **Person** (team members, authors): name **R**, `jobTitle`, `worksFor` → `#org`, `sameAs`.

## 8. Generating the graph

Keep the facts in one data file (company details, services, FAQs) that renders both the visible
page and the JSON-LD, so they can't disagree. In a build plugin:

```js
const graph = { '@context': 'https://schema.org', '@graph': [org, website, webpage(page), ...pageNodes(page)] };
const tag = `<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>`;
```

Escaping `<` keeps a `</script>` inside a string from ending the block early.
