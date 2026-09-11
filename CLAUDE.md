# Claude Code — Vercel Agent Skills

This repo is a Claude Code project configured with Vercel agent skills. The skills teach Claude best practices for Vercel deployments, React, React Native, and web UI design.

## Installed Skills

Skills live in `.claude/skills/` (symlinks → `.agents/skills/`). Invoke them with the `Skill` tool or a `/skill-name` slash command.

| Skill | Trigger phrases |
|---|---|
| `deploy-to-vercel` | "deploy my app", "push this live", "create a preview deployment" |
| `vercel-cli-with-tokens` | "deploy to Vercel", "set up Vercel", "add environment variables to Vercel" |
| `vercel-composition-patterns` | compound components, boolean prop proliferation, component architecture |
| `vercel-react-best-practices` | React/Next.js performance, data fetching, bundle optimization |
| `vercel-react-native-skills` | React Native, Expo, mobile performance, animations |
| `web-design-guidelines` | "review my UI", "check accessibility", "audit design", "check best practices" |

## Workflow

- **Default to preview deployments** — never deploy to production unless explicitly asked.
- **Never `git push` without user approval** — always ask first.
- **Never pass `VERCEL_TOKEN` as a CLI flag** — export it as an environment variable.
- **Check `.vercel/project.json` or `.vercel/repo.json`** before running any Vercel link commands.

## Key Commands

```bash
# Install/update skills
npx skills add vercel-labs/agent-skills --yes

# Deploy (preview)
vercel deploy -y --no-wait

# Deploy (production — only when explicitly requested)
vercel deploy --prod -y --no-wait
```

## Skill Sources

Skills are pinned via `skills-lock.json`. Source: `vercel-labs/agent-skills` on GitHub.
