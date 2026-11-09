# Newsletter: project rules

Newsletter: SvelteKit 2 + TypeScript, pnpm, Tailwind. TODO: one line on what it does (sign-up page, editor, sending), the mail provider, and where it deploys.

## Commands

| Command        | Healthy result                                                          |
| -------------- | ----------------------------------------------------------------------- |
| `pnpm install` | No errors                                                               |
| `pnpm dev`     | App on localhost:5173                                                   |
| `pnpm test`    | `Test Files  N passed`, no `FAIL` lines                                 |
| `pnpm check`   | `svelte-check found 0 errors and 0 warnings`                            |
| `pnpm lint`    | Prettier "All matched files use Prettier code style!", no ESLint output |

## Layout

- `src/lib/components/`: UI components. `src/lib/server/`: server-only code (DB, mail provider)
- `src/routes/`: pages and endpoints

## Conventions

- Svelte 5 runes (`$state`, `$derived`, `$props`); no `export let`, no stores for local state
- Prefer SvelteKit form actions with progressive enhancement (`use:enhance`) over client-side `fetch`
- Use Tailwind theme tokens and `DESIGN.md`, never arbitrary values
- Secrets come from `$env/static/private` or `$env/dynamic/private`, only in `src/lib/server/` or `+*.server.ts`
- Keep comments minimal; write self-explanatory code and comment only where the code cannot tell the story
- Test the business rule or bug the task is about, not for coverage

## Never touch

- `.env*` files: never read or edit them; change `.env.example` instead
- Real subscribers: never send real email or touch the production subscriber list
- `pnpm-lock.yaml`: never edit it by hand; use `pnpm`

## Working

- Propose a plan and wait for approval before editing more than one file
- Before reporting a task done, run `pnpm lint`, `pnpm test` and `pnpm check`, and paste the result. If something fails, fix the code, not the test

## Git

- Never push or merge into `main`; ask before anything that touches the remote

## Things agents get wrong

(Add a line whenever the agent makes the same mistake twice.)
