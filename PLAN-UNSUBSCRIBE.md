# Plan: unsubscribe

The next step in moving the newsletter to Resend (see `EMAIL.md`). It lets a reader leave the list in two ways: from the link at the bottom of each issue, and from their mail client's own "Unsubscribe" button (one-click unsubscribe, RFC 8058).

It has to exist before any issue goes to real readers. Gmail and Yahoo expect it, Resend requires it for newsletter mail sent through `/emails`, and GDPR requires an easy way to withdraw consent.

## Where things stand

- `renderIssue` in `src/lib/server/issue-email.ts` already puts a link to `/unsubscribe/<token>` in every issue email, plus these headers:
  - `List-Unsubscribe: <https://…/unsubscribe/<token>>`
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
- That route doesn't exist yet, so the link gives a 404. The admin test email uses the token `test`, which never matches a reader.
- Every `Subscriber` already has a unique `unsubscribeToken` (a cuid) and a nullable `unsubscribedAt`. **No migration is needed.**
- `subscribe()` already handles someone who signs up again after unsubscribing: they get a new confirm link and must confirm again. A test for that already exists in `subscribe.spec.ts`.

## What to build

### 1. `unsubscribe(token)` in `src/lib/server/subscribe.ts`

- If no reader has that token, return `false`.
- Otherwise set `unsubscribedAt` to now, unless it's already set, and return `true`.
- Unsubscribing twice must be harmless: the second call keeps the first date.

### 2. The route `src/routes/unsubscribe/[token]/`

- **`+page.svelte`**: a page that asks "Vill du avsluta prenumerationen?" and has one button. After the click it says "Du får inga fler brev" with a link back to the sign-up page. For an unknown token it says the link doesn't work, like the "Länken fungerar inte" state in `src/routes/confirm/[token]/+page.svelte`. Match that page's layout and DESIGN.md tokens.
- **`+page.server.ts`**:
  - **`load` must not unsubscribe.** It may check whether the token is known. Outlook Safe Links and other scanners open every link in an email, so unsubscribing on GET would remove readers who never clicked.
  - One **`default` action** calls `unsubscribe(params.token)` and returns the result as data.
  - Use `default`, not a named action. The mail client POSTs to the exact URL in the header, `/unsubscribe/<token>`, with no `?/name`, so only a default action receives it. The same action then handles both the button and one-click.
  - Don't redirect. Mail clients don't follow redirects; a plain 200 response is what they expect.
  - Ignore the request body: `List-Unsubscribe=One-Click` carries no information we need.
- Use `use:enhance` on the button.

### 3. CSRF: let one-click through without weakening the rest

**The problem**, checked against the installed SvelteKit (`node_modules/@sveltejs/kit/src/runtime/server/respond.js` and `csrf.js`):

- SvelteKit rejects `POST`, `PUT`, `PATCH` and `DELETE` requests with a form content type (or none) whose `Origin` doesn't match our own. That includes requests with **no `Origin` header**, which is how a mail provider's one-click POST usually arrives. It answers 403 "Cross-site POST form submissions are forbidden".
- The check runs **before** `hooks.server.ts`, so a hook can't make an exception.
- `csrf.trustedOrigins` can't help: a missing `Origin` is always rejected. Only `trustedOrigins: ['*']` turns the check off, and only for the whole app.
- **The check doesn't run in `npm run dev`.** One-click works locally and fails in production, so it must be tested against a production build.

**The fix:**

1. Set `csrf: { trustedOrigins: ['*'] }` in the `sveltekit({ … })` options in `vite.config.ts`, next to `adapter`. `npm run check` confirms the option is accepted there. This turns SvelteKit's own check off.
2. Add the same check ourselves in a new `src/lib/server/csrf.ts`: `isForbiddenCrossSiteRequest(request, url)`. It returns `true` when **all** of these hold:
   - The method is `POST`, `PUT`, `PATCH` or `DELETE`.
   - The content type is missing, or is `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`.
   - The `Origin` header is missing or isn't `url.origin`.
   - The path is **not** exactly `/unsubscribe/<token>`, matched with `^/unsubscribe/[^/]+$`.
3. Call it **first** in `handle` in `src/hooks.server.ts`, before the admin redirect, and answer 403 when it returns `true`.

Why this is safe:

- Login, the admin actions and the sign-up form keep the same protection as today.
- The admin session cookie is also `sameSite: 'lax'`, which already keeps it off cross-site POSTs.
- Remote functions are checked separately by SvelteKit and aren't affected by `trustedOrigins`.
- JSON requests aren't covered by this check, so the planned Resend webhook (JSON) works either way.
- The only route that accepts cross-site form posts is the unsubscribe one. Its "secret" is the token in the URL, and the worst a forged request can do is unsubscribe the owner of a token the attacker already has.

## Tests

The point is to test the rules, not to raise coverage.

- **`subscribe.spec.ts`, `unsubscribe()`:** an unknown token returns `false` and writes nothing; a known token sets `unsubscribedAt`; a second call keeps the first date.
- **`csrf.spec.ts`:**
  - Blocked: a cross-site form POST to `/login`, a form POST to `/admin` with no `Origin`, and a POST to `/unsubscribe/abc/extra`.
  - Allowed: a same-origin form POST, a JSON POST from another origin, any GET, and a form POST with no `Origin` to `/unsubscribe/abc`.
- **Page test, `src/routes/unsubscribe/[token]/page.svelte.spec.ts`:** before the action it shows the button and no confirmation; after a successful action it shows the confirmation; with an unknown token it shows the "doesn't work" message.

## Checking it by hand

1. **The button:** with `npm run dev`, subscribe with your Resend account address, confirm, and copy that subscriber's `unsubscribeToken` from Prisma Studio (`npm run db:studio`). Open `/unsubscribe/<token>`, click the button, and check that `unsubscribedAt` is set.
2. **CSRF in a production build** (`npm run build && npm run preview`, or a Vercel preview deploy):
   - `curl -i -X POST -d 'List-Unsubscribe=One-Click' <url>/unsubscribe/<token>` should give **200**, with no `Origin` header, the way mail providers send it.
   - `curl -i -X POST -H 'Origin: https://evil.example' -d 'password=x' <url>/login` should give **403**.
   - Logging in and adding entries in `/admin` must still work.

   If `vite preview` doesn't run with the Vercel adapter, use a preview deploy. Vercel's Deployment Protection may then need a bypass token for curl.

## Docs to update

- `EMAIL.md`, "Unsubscribe" section: replace the "Watch out" note with the CSRF solution above.
- `ARCHITECTURE.md`: `/unsubscribe/[token]` is no longer _planned_ in the routes table. This file is in `.gitignore`, so the change stays local.

## Out of scope

- The `Delivery` table and cron sending (the next step).
- The bounce and complaint webhook.
- A subscriber list in `/admin`.

## Rules (from `AGENTS.md`)

- Don't read or edit `.env*` files, except `.env.example`.
- Don't send email to real readers.
- No database migrations are needed. If one turns out to be needed, write the SQL offline and let the author apply it.
- Before calling it done, run `npm run lint`, `npm test` and `npm run check`, and paste the results.

## Done when

- [ ] `/unsubscribe/<token>` shows a confirm page, and the button unsubscribes the reader.
- [ ] A form POST with no `Origin` to `/unsubscribe/<token>` returns 200 and unsubscribes, in a production build.
- [ ] Cross-site form POSTs to every other route still return 403, in a production build.
- [ ] Tests, lint and check pass.
- [ ] `EMAIL.md` is updated.
