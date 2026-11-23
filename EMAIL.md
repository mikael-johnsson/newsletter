# Email

How the newsletter sends email, and why. See `ARCHITECTURE.md` for the sending flow and `PRODUCT.md` for the product.

## Decisions

| Decision | Choice                                                                   | Why                                                                                                                               |
| -------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Provider | [Resend](https://resend.com)                                             | Simple API, a batch endpoint that fits the cron design, idempotency keys and signed webhooks                                      |
| List     | Subscribers stay in Postgres; issues go out through `POST /emails/batch` | Our database stays the only list, so there is nothing to sync, reader data stays with us (GDPR), and `mail.ts` stays swappable    |
| Not used | Resend Contacts, Segments, Broadcasts and Automations                    | They need a second copy of the list inside Resend, and our cron, `Delivery` rows and unsubscribe page already cover the same jobs |
| Domain   | None for now: send from `onboarding@resend.dev`                          | Enough to build and test. A verified domain is needed before real readers get anything; see [Going live](#going-live)             |

## Without our own domain

Resend only sends from domains you have verified. Until we have one, the sender is `onboarding@resend.dev`, and Resend then **only delivers to the email address of the Resend account owner**. Mail to anyone else is rejected with a 403.

That's enough for development:

- The whole flow can be tested end to end: sign up, confirmation email, a newsletter issue, unsubscribe. Use the account owner's address as the only subscriber.
- Resend's test address `delivered@resend.dev` accepts mail without delivering it, which works for automated or repeated sends.
- It also matches the `AGENTS.md` rule: development can't reach real readers, because Resend won't deliver to them.

## Sending

### Confirmation email (double opt-in)

Resend has no built-in double opt-in, so we build it ourselves:

1. The `subscribe` action creates the `Subscriber` and calls `sendConfirmation(to, confirmUrl)` in `mail.ts`.
2. `sendConfirmation` sends one email through `POST /emails` (`resend.emails.send`).

Resend Automations can start on custom events from the app, but we don't use them: one direct API call is simpler and easier to test.

### Newsletter issues

The cron flow in `ARCHITECTURE.md` stays as it is. Resend only fills in `mail.ts`:

- `sendBatch(messages)` sends up to **100 emails per call** through `resend.batch.send`, so the cron's batch size is 100.
- The rate limit is **10 requests per second per team**, and one batch call counts as one request. That isn't a constraint at our size.
- Every batch call has an `Idempotency-Key` built from the newsletter id and that batch's subscriber ids, so a retried call isn't sent twice. Keys last 24 hours. The `Delivery` rows still guard against duplicates across cron runs.
- Batch calls don't support attachments, and issues don't need them.
- We don't use Resend's `scheduled_at`. Scheduling lives in `Newsletter.scheduledFor` and Vercel Cron, so it is done in one place only.

### Vercel Cron is moving to Schedules

[Vercel's docs](https://vercel.com/docs/schedules/cron-jobs) call Cron Jobs a legacy feature that "will be migrated to Schedules in the future". No date is given, and Schedules are still in beta. We use Cron Jobs (`crons` in `vercel.json`) until Schedules are stable. Moving over is a config change only; the route code stays:

- Move the entry from `crons` to `schedules` and remove `crons` in the same change, or the route runs twice:
  `{ "schedules": { "send-issues": { "schedule": "…", "path": "/api/cron/send", "requestMethod": "GET" } } }`
- Set `requestMethod: "GET"`: Schedules default to `POST`, which our endpoint doesn't handle.
- `CRON_SECRET` works the same: path targets get `Authorization: Bearer <CRON_SECRET>`.
- On Hobby, Schedules can run every 15 minutes (with up to 15 minutes' jitter) instead of once a day, so "Skicka nu" would go out much sooner.
- Schedules can also run on preview deployments (off by default). Leave that off: a preview run would send with the preview's URL in the unsubscribe links, from the preview's database.

### Unsubscribe

With `/emails` we handle unsubscribes ourselves, and Resend requires it for newsletter mail:

- A visible link to `/unsubscribe/[token]` in every issue.
- Headers on every issue:
  - `List-Unsubscribe: <https://…/unsubscribe/[token]>`
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click` (RFC 8058, which Gmail and Yahoo require from bulk senders)
- `/unsubscribe/[token]` shows a confirm page on GET and unsubscribes only in its **default form action**. GET must never unsubscribe, because link scanners such as Outlook Safe Links open every link. The mail client's one-click POST goes to the bare URL from the header, so only a default action receives it, and it gets a plain 200, no redirect.

**CSRF:** the one-click POST comes from another site, usually with no `Origin` header, and SvelteKit's own check rejects it before any hook runs. So `vite.config.ts` turns SvelteKit's check off (`csrf: { trustedOrigins: ['*'] }`), and `src/lib/server/csrf.ts` does the same check first thing in `handle`, except for paths matching `^/unsubscribe/[^/]+$`. Every other route keeps the protection. Unlike SvelteKit's check, ours also runs in `npm run dev`; still confirm `trustedOrigins` on a production build (`npm run build && npx vite preview`), since only there would SvelteKit's check block one-click.

### Bounces and complaints

A webhook endpoint, `/api/webhooks/resend`, sets `bouncedAt` on `email.bounced` and `unsubscribedAt` on `email.complained` (a spam complaint counts as unsubscribing). Sending skips both. A bounced reader who signs up and confirms again gets `bouncedAt` cleared.

- Resend signs webhooks with Svix. Verify the **raw** request body with `resend.webhooks.verify(...)`, never re-serialized JSON. A wrong signature gets 400.
- Retries reuse the same `svix-id` header. Fields are only set when empty, so a repeated event changes nothing and event ids aren't stored.
- Other events and unknown addresses get 200, so Resend doesn't retry them.
- The free plan allows 1 webhook endpoint, which is all we need.

## Configuration

To add to `.env.example` and `src/env.ts`, read only in `src/lib/server/`:

| Variable                | Value                                          |
| ----------------------- | ---------------------------------------------- |
| `RESEND_API_KEY`        | API key from the Resend dashboard              |
| `MAIL_FROM`             | `Push to Main <onboarding@resend.dev>` for now |
| `RESEND_WEBHOOK_SECRET` | The webhook's signing secret                   |

`mail.ts` keeps its safety rule: outside production it logs, or sends only to an allow-listed test address.

## Cost

Resend counts mail sent through `/emails` as transactional mail:

- **Free:** 3,000 emails per month, but **100 per day**. That's enough while building and for an issue to fewer than about 100 readers.
- **Pro:** $20 per month for 50,000 emails, with no daily limit. Needed once an issue goes to more than about 100 readers.

Billing is monthly only, with no annual discount.

## Going live

Before the first issue reaches a real reader:

1. Buy a domain, and send from a subdomain such as `nyhetsbrev.<domain>.se`. Resend strongly recommends one, so problems with the newsletter don't hurt the main domain's reputation.
2. Add the domain in Resend and pick the EU region.
3. Add the SPF and DKIM records exactly as Resend generates them. If the DNS is on Cloudflare, don't proxy the CNAME records. Verification usually takes about 15 minutes, and up to 72 hours.
4. Add a DMARC record.
5. Change `MAIL_FROM` to an address on the new subdomain.
6. Move to the Pro plan once the list grows past about 100 readers.

## Not verified yet

These come from general knowledge or from Resend's docs index, not from the doc pages themselves:

- The exact rule for `onboarding@resend.dev`: from the docs index, it only delivers to your own address.
- The DMARC record, which regions exist, and webhook retry timing.
- How to exempt one route from SvelteKit's CSRF check.
