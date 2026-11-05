# Contributing

## Adding a skill

1. Create `skills/<name>/SKILL.md`. The name is lowercase with single hyphens and matches the folder.

   ```markdown
   ---
   name: my-skill
   description: >
     One short sentence on what it does. Then what it covers, which scripts it brings, and
     "Use it when …" with the phrases people actually type.
   compatibility: Needs Node.js 18 or later.
   metadata:
     author: Your Name
     version: "1.0.0"
     updated: "YYYY-MM-DD"
   ---

   # Title

   Steps, rules, and links to references/… for the detail.
   ```

2. Put long material in `references/*.md` (one topic per file, linked from `SKILL.md`), templates
   in `assets/`, tools in `scripts/`.
3. If the skill needs a shared helper, add the skill to `shared/manifest.json` and run
   `npm run sync`.
4. Add tests in `tests/` (a planted mistake in `tests/fixtures/site/` or a known-answer unit test).
5. `npm run check`.

## Updating a fact

Prices, limits and platform behaviour change. When you update one:

- Change every place it appears (`grep` for the old number).
- Write the new check date next to it, and keep or add the source link.
- For Vercel prices, also update `TIERS` and `CHECKED` in
  `skills/vercel-cost-optimization/scripts/budget.mjs` and its test.

## Changing a shared script

Edit `shared/<file>`, run `npm run sync`, then `npm run check`. CI fails if a copy differs.

## Style

- Plain, short sentences; the reader is an AI assistant and the person reviewing its work.
- Say what to do and why, with numbers where they exist.
- No unverified claims: when unsure, say how to check.

## Pull requests

- [ ] `npm run check` passes
- [ ] New checks have tests; new audit check ids are in `references/checks.md`
- [ ] Facts carry a check date and a source
- [ ] `CHANGELOG.md` updated
