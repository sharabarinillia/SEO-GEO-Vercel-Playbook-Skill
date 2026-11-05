# Coding agents, commits and seats

## The rule

"To deploy commits under a Vercel Pro or Enterprise team, the commit author must be a member of
the team." On Hobby, the commit author must be the owner of the Hobby team.
([Troubleshoot project collaboration](https://vercel.com/docs/deployments/troubleshoot-project-collaboration), checked November 2026)

AI coding agents commit under their own identity by default. On Pro with a private repository,
that either blocks the deployment or needs a second paid seat.

## The fix, per repository, before the first commit

```sh
git config user.name "First Last"
git config user.email "the-email-on-their-github-account@example.com"
git config commit.gpgsign false   # only if the agent's environment signs with its own key
```

- If the agent's environment signs commits with its own key, GitHub shows them as "Unverified"
  under the human's name. Turn signing off for that repository unless the human's key is available.
- A third-party report says AI co-author trailers (`Co-Authored-By: …`) make GitHub list the agent as
  a contributor and block deployments on Hobby. Leave the trailer out where that matters.
- Write the rule into the repository's agent instructions so every new session follows it:

```markdown
## Commits
Every commit is authored and committed as **First Last <email>**, never as the agent:
on Vercel Pro, only commits by team members deploy. Run the three `git config` lines above in a
new clone before the first commit. No `Co-Authored-By` lines for agents.
```

(`CLAUDE.md` for Claude Code, `AGENTS.md` for Codex, Cursor, Copilot and most others.)

## Deploy volume

Every push to a connected branch builds and stores a deployment. Agents that push after every
small edit multiply builds and storage. Ask them to commit locally and push when a piece of work
is ready and checked.
