# Lessons learned

Mistakes and surprises from real launches, with what to do instead.

## AI agent commits blocked deployments

Every commit was authored by the coding agent's own identity, which is a real GitHub account. On
Vercel Pro with a private repository, the commit author must be a member of the team, so the
deployment was blocked (or would have needed a second paid seat).

**Do:** set the repository's `git config user.name` and `user.email` to the human team member
before the first commit, turn off commit signing if the agent's environment signs with its own
key, and write the rule into `CLAUDE.md` / `AGENTS.md` so every new session follows it. Reports
also say AI co-author trailers block deployments on Hobby.

## Generated config edited by hand

`vercel.json` was written by a script and then edited directly. The next run would have dropped
the change. **Do:** change the generator and run it.

## Sitemap dates that moved for no reason

Hashing the markup of `<main>` bumped `lastmod` when only a video source changed. Google uses
`lastmod` only when it is consistently accurate. **Do:** hash the visible text (title, description,
text of `<main>` without tags), or keep the old date when only markup changed.

## Video tests in headless browsers

Some headless Chromium builds can't play H.264 and fall back to the next `<source>`, which looked
like phones downloading two videos. **Do:** check
`canPlayType('video/mp4; codecs="avc1.640028"')` in the test browser before trusting video numbers.

## Inline SVG symbols and clip paths

A `display: none` holder for the logo `<symbol>` broke the clip paths inside it. **Do:** use a
zero-size, absolutely positioned `<svg>` holder.

## Floating-point noise at exact boundaries

34 EUR pallets × 0.4 LDM came out as 13.600000000000001, so exactly one full trailer read as
"2 trailers". **Do:** round domain values (for example to a millionth) before comparing or rounding
up, and put the exact boundaries in the tests.

## A shared module added a request

A small module imported by a few pages became its own script file: one more request on every
first visit to those pages. **Do:** group it with a chunk those pages already load (Rolldown
`codeSplitting` groups with `includeDependenciesRecursively: false`, so the group doesn't swallow
its dependencies), then check the script tags per page.

## Image optimisation services are not needed for static sites

Pre-generate AVIF and WebP at build time (`sharp`) and serve them as static files. A paid image
service adds cost and requests without a visible gain.

## Inline regex flags broke a deployment

Vercel compiles `vercel.json` route sources as JavaScript regular expressions, so `(?i)` failed the
deployment. **Do:** run every pattern through `new RegExp()` in the script that writes the file.
