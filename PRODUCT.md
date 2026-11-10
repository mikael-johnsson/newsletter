# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Readers:** juniors early in their careers who want short news and relevant job ads from one author in their inbox. They meet the product on the public sign-up page and afterwards mostly in their email client.
- **The author:** one person who writes the newsletter, sends issues and manages their own subscriber list.

## Product Purpose

A personal newsletter, **Juniorens nyhetsbrev**: one author writing to their own readership, once a week. The product lets readers subscribe, lets the author put together and send issues by email, and lets the author manage the subscriber list. An issue is an ordered list of entries: job ads, articles and the author's own posts. Success means readers sign up and the author can publish without friction.

## Positioning

The author's own words on the sign-up page: "Korta nyheter och jobbannonser anpassade för din plats i karriären. Brevet kommer en gång i veckan - aldrig oftare."

Open decision: what sets it apart from other job and news newsletters has not been stated. Do not invent a tagline or value claim beyond the line above; ask the author.

## Operating Context

- Readers sign up on a public web page, then read issues as email.
- The author works in a private admin area (`/admin`). There is always one draft issue: the one going out the coming week. The author adds job ads from Platsbanken, articles and own posts to it, and removes them again. Sending an issue starts the next week's draft.
- Sending goes through a mail provider (not yet chosen).

## Capabilities and Constraints

In scope:

- Public sign-up page
- Admin for building issues from entries (job ads, articles, own posts) and managing subscribers
- Job ads fetched from Arbetsförmedlingen's Platsbanken through the official JobTech API
- Sending issues by email

Out of scope for now: a public web archive of past issues.

Decided: the name (Juniorens nyhetsbrev), the topic (short news and job ads for juniors), a weekly cadence, and Vercel as the deploy target.

Undecided: the mail provider, and where articles come from.

Never send real email or touch the production subscriber list during development.

## Evidence on Hand

None yet: no subscriber counts, testimonials, past issues or press. Future work must not fabricate any of them.

## Product Principles

1. **One voice.** It is one person's newsletter; the product serves that author and their readers, not a platform of many writers.
2. **Subscribing is the whole job of the public page.** Nothing on it should compete with signing up.
3. **The email is the product readers keep.** Issues must read well in an inbox, not only on the web.
4. **Respect the list.** Subscriber data and sending are handled carefully; no accidental sends.
