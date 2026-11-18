# Plan: sending an issue

The next step in moving the newsletter to Resend (see `EMAIL.md`). It lets the author send the current draft to every confirmed reader, through the cron flow in `ARCHITECTURE.md`.

## Where things stand

- `renderIssue(issue, unsubscribeUrl)` in `src/lib/server/issue-email.ts` renders an issue for one reader, with the unsubscribe link and headers.
- `mail.ts` sends single emails through `send()`, guarded by `MAIL_SEND` (`off`, `allowlist`, `all`). There's no batch send yet.
- `markSent(id)` in `src/lib/server/newsletters.ts` sets `SENT` and `sentAt` and creates the next draft. Nothing calls it yet.
- `Newsletter` already has `status` (`DRAFT`, `SCHEDULED`, `SENDING`, `SENT`), `scheduledFor`, `sentAt` and the index `@@index([status, scheduledFor])`.
- There is **no `Delivery` model**, no cron endpoint, no `vercel.json`, no `CRON_SECRET`, and no way to schedule the draft from `/admin`.
- Draft edits are already locked to `DRAFT`: `removeEntryFromDraft` checks the status, and the add functions go through `getCurrentDraft()`, which only returns a `DRAFT`. So an issue can't change while it's being sent.

## What to build

### 1. `Delivery` model and migration

In `prisma/schema.prisma`:

```prisma
model Delivery {
  newsletterId String
  subscriberId String
  sentAt       DateTime   @default(now())
  newsletter   Newsletter @relation(fields: [newsletterId], references: [id], onDelete: Cascade)
  subscriber   Subscriber @relation(fields: [subscriberId], references: [id], onDelete: Cascade)

  @@id([newsletterId, subscriberId])
}
```

- Add `deliveries Delivery[]` to both `Newsletter` and `Subscriber`.
- The composite id doubles as the unique constraint from `ARCHITECTURE.md`, so nobody gets an issue twice.
- `onDelete: Cascade` on the subscriber means that erasing a reader (GDPR) also removes their delivery history.
- Write the SQL offline with `npx prisma migrate diff --from-schema <old> --to-schema prisma/schema.prisma --script` into `prisma/migrations/<timestamp>_deliveries/`, run `npm run db:generate`, and leave applying it to the author.

### 2. `sendBatch(messages)` in `mail.ts`

- Takes up to 100 messages (`Email[]`, each with its own `to`, `html`, `text` and `headers`) and an idempotency key.
- Splits them with the existing `isAllowed(to)`: allowed ones go to `client.batch.send(...)` in one call, and the rest are logged the way `send()` logs them.
- Skips the Resend call when none are allowed. Throws when Resend returns an error, like `send()` does.
- Uses the default `batchValidation: 'strict'`: if one email is invalid, the whole batch fails and nothing is half sent.

### 3. The send rules: new `src/lib/server/send-issue.ts`

**`scheduleDraft(now)`**

- Moves the current draft to `SCHEDULED` with `scheduledFor = now`.
- Refuses an empty draft, like the test-send action does.

**`claimDueIssues(now)`**

- Runs `updateMany({ where: { status: 'SCHEDULED', scheduledFor: { lte: now } }, data: { status: 'SENDING' } })`.
- It's a single conditional update, so two overlapping runs can't both claim the same issue.

**`sendNextBatch(newsletter, origin)`**

1. Picks up to 100 readers where `confirmedAt` is set, `unsubscribedAt` is null, and there's no `Delivery` for this issue. It orders them by `id`, so a retried run picks the same set.
2. If none are left, it calls `markSent(newsletter.id)` and returns `'done'`.
3. Otherwise it renders one email per reader with `renderIssue(newsletter, `${origin}/unsubscribe/${reader.unsubscribeToken}`)`.
4. It sends them with `sendBatch`. The idempotency key is `issue/<newsletterId>/<sha256 of the sorted subscriber ids>`. Resend keys can be at most 256 characters, and 100 raw cuids would be far longer.
5. Then it writes the `Delivery` rows with `createMany({ skipDuplicates: true })` and returns `'more'`.

Why this order is safe:

- If the run crashes after the send but before the rows are written, the next run picks the same readers. It builds the same key, and Resend drops the repeat within 24 hours.
- If two runs work on the same `SENDING` issue at once, the same key and `skipDuplicates` keep anyone from getting it twice.
- A reader who was only logged (not allowed by `MAIL_SEND`) still gets a `Delivery` row. Otherwise the issue would never finish in `allowlist` mode.

**`runSend(origin, deadline)`**

- Calls `claimDueIssues`, then loops `sendNextBatch` over every `SENDING` issue until each one is `'done'` or the time is past `deadline`.
- Whatever is left over is picked up by the next run.

### 4. `src/routes/api/cron/send/+server.ts`

- A `GET` handler. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. The handler answers 401 unless that header matches, and also 401 if `CRON_SECRET` is unset.
- Calls `runSend(url.origin, Date.now() + 45_000)` and returns JSON with how many emails were sent.
- Vercel Cron only calls the production deployment, so `url.origin` gives the right unsubscribe links. Previews never send.
- `CSRF`: this is a GET, so `isForbiddenCrossSiteRequest` doesn't apply.

### 5. `vercel.json`

```json
{ "crons": [{ "path": "/api/cron/send", "schedule": "0 7 * * *" }] }
```

**Checked against Vercel's docs:** Hobby allows cron jobs **once per day**, fired anywhere within the hour (`0 7 * * *` runs between 07:00 and 07:59 UTC); Pro allows every minute. On Hobby, "Skicka nu" means "goes out at the next daily run". On Pro, use `*/5 * * * *`. The 45-second budget per run is there for Vercel's function time limit either way.

**Cron Jobs are moving to Vercel Schedules.** Vercel calls Cron Jobs legacy and will migrate them to Schedules (in beta, no date given). Moving is a `vercel.json` change only, and on Hobby Schedules allow every 15 minutes. Details in `EMAIL.md` under "Vercel Cron is moving to Schedules".

### 6. Config

- Add `CRON_SECRET` to `src/env.ts` (optional; the endpoint refuses everything without it) and to `.env.example`.
- Set the same value in Vercel's project settings.

### 7. `/admin`: a "Skicka nu" button

- A `schedule` form action calls `scheduleDraft()` and returns a message such as "Vecka 48 skickas vid nästa utskick."
- `load` also returns any issue that is `SCHEDULED` or `SENDING`, and the page shows one line about it, for example "Vecka 48 skickas" or "Vecka 48 skickas nu, 200 av 340 klara".
- After scheduling, `getCurrentDraft()` creates the next draft on its own, as `ARCHITECTURE.md` already describes.
- The button gets a confirm step, such as a second "Ja, skicka till alla" button, because sending can't be undone.
- Use `use:enhance` and match the existing test-send section and `DESIGN.md`.

## Not in this step

- `/admin/issues` with past issues and a date picker for a later time.
- Unscheduling. It's tricky because a new draft already exists by then. Until we build it, the author can only unschedule by editing the database.
- The bounce and complaint webhook. It comes once a verified domain lets mail reach real readers.

## Tests

The point is to test the rules, not to raise coverage. Mock `db` the way `newsletters.spec.ts` does.

**`send-issue.spec.ts`**

- `claimDueIssues` only matches `SCHEDULED` issues whose `scheduledFor` is in the past.
- `sendNextBatch` only asks for confirmed, still-subscribed readers without a `Delivery`, ordered by `id`, at most 100.
- It gives every email its own reader's unsubscribe URL.
- The same readers give the same idempotency key in any order, the key is at most 256 characters, and a different issue gives a different key.
- When `sendBatch` throws, no `Delivery` rows are written.
- With no readers left, it calls `markSent` and sends nothing.
- `scheduleDraft` refuses an empty draft.

**`mail.spec.ts`**

- `sendBatch` sends only allowed addresses in `allowlist` mode.
- It never calls Resend when `MAIL_SEND` is off.
- It passes the idempotency key on.

**Cron endpoint**

- 401 without the header, with a wrong secret, and when `CRON_SECRET` is unset.

## Checking it by hand

1. Apply the migration, then set `MAIL_SEND=allowlist` and add your Resend account address to `MAIL_ALLOWLIST`. Subscribe and confirm with that address. Add a second, fake subscriber in Prisma Studio with `confirmedAt` set.
2. Run `npm run dev`, add an entry to the draft, and click "Skicka nu".
3. Call the endpoint with `curl -H "Authorization: Bearer $CRON_SECRET" localhost:5173/api/cron/send`. Check that:
   - You got the issue, and its unsubscribe link has your own token.
   - The fake reader was only logged.
   - Both readers have `Delivery` rows.
   - The issue is `SENT`.
4. Call the endpoint again. It should send nothing.
5. Call it without the header. It should answer 401.
