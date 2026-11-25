# The Junior's newsletter

A weekly newsletter for people early in their careers: short news and job ads, written by one author and sent by email once a week.

> "Korta nyheter och jobbannonser anpassade för din plats i karriären. Brevet kommer en gång i veckan - aldrig oftare."

## What it does

- **Readers** sign up with their email on the public start page. They get a confirmation email and are only added to the list after they click the link in it. Every issue has an unsubscribe link at the bottom.
- **The author** logs in to a private admin page (`/admin`). There they build the coming week's issue from job ads, articles and their own posts, send a test email to themselves, and then send the issue to everyone.

## How it works

- **Issues.** There is always exactly one draft: the issue going out the coming week, named "Nyhetsbrev vecka N". An issue is an ordered list of entries. When an issue has been sent, a new draft for the next week is created automatically.
- **Job ads** come live from Arbetsförmedlingen's Platsbanken through the official JobTech API.
- **Articles** come from a fixed list of news feeds (Hacker News, CSS-Tricks, Smashing Magazine, Josh W. Comeau, Computer Sweden, Breakit, Ny Teknik). Only articles from the last week are shown. The list is in `src/lib/server/articles.ts`.
- **Own posts** are short texts the author writes, with an optional link.
- **Sending.** Pressing send does not mail anyone right away. It queues the issue, and a scheduled job (Vercel Cron, set in `vercel.json`) sends it in batches of 100 the next time it runs, currently once a day at 07:00 UTC. The job keeps track of who has received the issue, so nobody gets it twice, even if a run stops halfway.
- **Email** goes through Resend. Until we have our own domain, Resend only delivers to the Resend account owner, so real readers can't be reached by mistake. See `EMAIL.md`.

Tech: SvelteKit + TypeScript, Tailwind, Prisma on Neon Postgres, deployed to Vercel. More detail in `PRODUCT.md` (who it's for), `EMAIL.md` (sending) and `DESIGN.md` (the look).

## Admin flow

This is how the author puts together and sends a weekly issue.

### 1. Log in

Go to `/login`, enter the admin password and press the button. You stay logged in for 30 days. Use **Log out** in the top right corner when you're done on a shared computer.

### 2. Look at the draft

On the left you see this week's draft: its name ("Nyhetsbrev vecka N") and everything you've added so far, in the order it will appear in the email. If it's empty, it says so.

On the right are three tabs with things you can add: **Jobb**, **Artiklar** and **Från redaktören**.

### 3. Add job ads (Jobb)

1. Type a search word in **Sök jobb** (for example "frontendutvecklare") and press **Sök**.
2. Browse the ads. Use the page numbers at the bottom to see more. Click an ad's title to open it on Platsbanken.
3. Press **+** on an ad to add it to the draft. The button turns into a **✓**, and the ad shows up in the draft on the left.

### 4. Add articles (Artiklar)

1. Open the **Artiklar** tab. You see the past week's articles, grouped by site.
2. Click a title to read the article.
3. Press **+** to add it to the draft. It turns into a **✓**.

If a site can't be reached, a message at the top says which one. The other sites still show.

### 5. Write your own post (Från redaktören)

1. Open the **Från redaktören** tab.
2. Fill in a **Titel** and a **Text**. **Länk** is optional: add a web address if the post should point somewhere.
3. Check the preview below the form; it shows how the post will look.
4. Press **+** to add the post to the draft.

### 6. Remove something

Press **−** next to an entry in the draft to take it out. This only works on the draft, never on an issue that has been sent.

### 7. Send a test email to yourself

Press **Skicka testmejl** under the draft. The current draft is mailed to the author's test address, so you can see exactly what readers will get. A message tells you whether it was sent. Do this before every real send.

### 8. Send to everyone

1. Press **Skicka till alla**. A short warning appears: the issue goes to every confirmed reader and can't be undone.
2. Press **Ja, skicka till alla** to confirm.
3. The page now says the issue "skickas vid nästa utskick" (goes out at the next send). The issue is mailed the next time the scheduled job runs, at the moment once a day in the morning.
4. While it's being sent, the page shows how many readers have received it so far.

Once the issue has gone out, a new empty draft for the next week is waiting on `/admin`, and you start again from step 2.

## Development

```sh
npm install
npx playwright install chromium   # once per machine, for component tests
npm run dev                        # http://localhost:5173
```

Copy `.env.example` to `.env` and fill it in. Use a Neon dev branch, never the production database. Keep `MAIL_SEND="off"` (only logs) or `"allowlist"` locally so no real reader is ever emailed.

Set the admin password with `ADMIN_PASSWORD='…' npm run admin:hash` and put the printed line in `.env` (and in Vercel's environment settings).

| Command               | What it does                                       |
| --------------------- | -------------------------------------------------- |
| `npm test`            | Unit and component tests                           |
| `npm run check`       | Type check                                         |
| `npm run lint`        | Prettier and ESLint                                |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |

Rules for contributors and agents are in `AGENTS.md`.
