# Review rules

What a review of this repo must check. Linters, Prettier and svelte-check handle style and types; skip them.

## Must check

- **Correctness:** the change does what the ticket asks; edge cases (empty list, bad email, duplicate sign-up) are handled
- **Secrets and server code:** private env vars and mail-provider calls only in `src/lib/server/` or `+*.server.ts`; nothing secret reaches the client bundle
- **Subscriber data:** no real sends from dev or tests; unsubscribe and double opt-in still work; no subscriber emails in logs
- **Input:** form actions validate on the server, not only in the UI
- **Newsletter drafts:** there is always exactly one `DRAFT`; entries are only added to or removed from the draft, never a sent issue; entry links are `http(s)` only; job ads are re-fetched by id on the server, never taken from form fields
- **Migrations:** a schema change comes with a migration in `prisma/migrations/`, and dropped columns or `NOT NULL` changes are called out
- **Conventions:** Svelte 5 runes, form actions over client `fetch`, Tailwind tokens from `DESIGN.md`
- **Tests:** the business rule or bug has a test; no coverage-only tests

## Skip

- Formatting, import order, naming nits the linter allows
- Comments asking for more comments

## Severity

- **Important:** blocks merge (bug, leak, data risk)
- **Nit:** optional; at most a few per review
