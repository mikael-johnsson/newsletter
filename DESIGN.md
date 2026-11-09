---
version: alpha
name: Newsletter
description: Starter tokens, bold and playful. Placeholders until a designer sets them.
colors:
  primary: "#FF4D2E"
  secondary: "#2B2BFF"
  accent: "#FFD23F"
  ink: "#141414"
  paper: "#FFF8EE"
  muted: "#6B6459"
typography:
  display:
    fontFamily: Bricolage Grotesque
    fontSize: 64px
    fontWeight: 800
    lineHeight: 1.0
    letterSpacing: -0.03em
  h2:
    fontFamily: Bricolage Grotesque
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.1
  body:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 8px
  md: 16px
  pill: 999px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
  xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.h2}"
    rounded: "{rounded.pill}"
    padding: 16px
  page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  highlight:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
  caption:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.muted}"
---

## Overview

Bold and playful: the newsletter should feel like a zine someone was excited to make, not a SaaS dashboard. Big type, confident color, a bit of mischief. These tokens are a starting point; a designer owns them.

## Colors

Warm paper background, near-black ink. One loud color per screen (primary or secondary), with accent for small highlights. Never all three at full size together.

## Typography

A chunky display face for headings, set tight and large. A calm, readable body at 18px; the issues are for reading.

## Layout

Generous spacing, a single readable column (~65ch) for issue content. Let big headings break the grid.

## Shapes

Round and friendly: pill buttons, soft cards. No hairline borders.

## Do's and Don'ts

- Do: one strong idea per screen; oversized headings; color blocks
- Don't: generic gradients, glassmorphism, grey-on-grey cards, stock "AI look" hero sections
- Don't: use colors or sizes outside these tokens; add a token here first
