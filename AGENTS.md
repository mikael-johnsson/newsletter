## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: none

---

# Newsletter: project rules

Juniorens nyhetsbrev: SvelteKit 3 + TypeScript, npm, Tailwind, Prisma on Neon Postgres, deployed to Vercel. A weekly newsletter for juniors: readers sign up on a public page (double opt-in), and the author builds each issue on `/admin` from job ads (Platsbanken, via the JobTech API), articles (source not chosen yet) and own posts. The mail provider is not chosen yet, so `mail.ts` only logs.

## Commands

| Command               | Healthy result                                                                  |
| --------------------- | ------------------------------------------------------------------------------- |
| `npm install`         | No errors                                                                       |
| `npm run dev`         | App on localhost:5173                                                           |
| `npm test`            | `Test Files  N passed`, no `FAIL` lines                                         |
| `npm run check`       | `svelte-check found 0 errors and 0 warnings`                                    |
| `npm run lint`        | Prettier "All matched files use Prettier code style!", no ESLint output         |
| `npm run db:generate` | Regenerates the Prisma client in `src/lib/server/prisma/` after a schema change |

Component tests (`*.svelte.spec.ts`) run in Chromium; run `npx playwright install chromium` once per machine.

## Layout

- `src/lib/components/`: UI components. `src/lib/server/`: server-only code (DB, mail, JobTech API, newsletter rules)
- `src/routes/`: pages and endpoints
- `prisma/schema.prisma` and `prisma/migrations/`: data model and migrations

## Conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`); no `export let`, no stores for local state
- Prefer SvelteKit form actions with progressive enhancement (`use:enhance`) over client-side `fetch`
- Use Tailwind theme tokens and `DESIGN.md`, never arbitrary values
- Secrets come from `$app/env/private`, only in `src/lib/server/` or `+*.server.ts`
- Keep comments minimal; write self-explanatory code and comment only where the code cannot tell the story
- Test the business rule or bug the task is about, not for coverage

## Never touch

- `.env*` files: never read or edit them; change `.env.example` instead
- Real subscribers: never send real email or touch the production subscriber list
- `package-lock.json`: never edit it by hand; use `npm`
- The database: never run `db:migrate` or `db:deploy`. Write the migration SQL offline (`npx prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script`) into a new `prisma/migrations/<timestamp>_<name>/` folder, and leave applying it to the author

## Working

- Propose a plan and wait for approval before editing more than one file
- Before reporting a task done, run `npm run lint`, `npm test` and `npm run check`, and paste the result. If something fails, fix the code, not the test

## Git

- Never push or merge into `main`; ask before anything that touches the remote

## Things agents get wrong

(Add a line whenever the agent makes the same mistake twice.)
