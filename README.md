# ryanyarali.com

Personal portfolio site for Ryan Yarali, a Computer Systems Technology student
at BCIT. Built with plain HTML, CSS, and JavaScript. No framework, no build
step, no dependencies to install. The one library, three.js for the hero
globe, is vendored in `assets/vendor/`.

Live at [ryanyarali.com](https://ryanyarali.com), served by Cloudflare Workers
(free plan) from this repository: the files are the site, and one small Worker
in `worker/` handles the contact form and passes the client previews
(`/taha-portfolio/` and the other GitHub project pages) through to GitHub.

## Running locally

There is nothing to build. Serve the directory with any static file server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. Opening `index.html` directly from the file
system also works, though root-relative paths (`/favicon.svg`) will not
resolve.

## Structure

```
index.html            Home: hero, about, projects, skills, education, contact
projects.html         Full project list
projects/             Case studies
  nooklook.html
  taskmate.html
404.html              Custom not-found page
projects/this-site.html  Case study of this site
resume.html           Résumé placeholder until the PDF is added (noindex)
assets/
  css/
    style.css         Global overrides, loaded last
    tokens.css        Design tokens: colour, type, spacing, radii, shadows
    reset.css         Baseline reset and focus styles
    typography.css    Type scale and text utilities
    layout.css        Navigation, sections, footer, scroll reveal
    components.css    Buttons, forms, tags, cards
    interactive.css   Ambient trace, light/dark switch, stat strip, project accordion
    motion.css        Intro, hero, globe, cursor, stacking, route, gallery
    bold.css          Skills grid, terminal, contact, footer, projects page, case studies, 404
    pages.css         Page- and section-specific styles
  js/
    theme.js          Light/dark theme with system preference + persistence
    form.js           Contact form validation and submission
    main.js           Mobile menu, scroll reveal, heading scan, active nav, back to top
    flair.js          Skill tile pixel icons, project hover preview, Ctrl/Cmd K terminal
    interactive.js    Ambient trace, counters, accordion, magnetic buttons
    hero.js           First-visit intro, hero entrance, lazy globe loader
    hero-globe.js     The WebGL network globe (ES module, three.js)
    cursor.js         Cursor ring that follows the real pointer
    route.js          The winding route: a timeline line through every heading
    ping.js           Ping, the packet creature that rides the route
    ping-sprite.js    Ping's pixel-art sprite: character maps drawn as SVG rects
    story.js          Home page stacking, About word fill, portrait tilt
  vendor/three/       three.js r186, the one third-party library (see its README)
robots.txt, sitemap.xml, llms.txt, favicon.svg
_headers            Response headers and cache rules on Cloudflare
wrangler.jsonc      Cloudflare config; .assetsignore keeps repo files off the site
worker/             The Worker: contact form, client previews, D1 migrations
test/               node --test: prices in sync, form checks, emails, routing
```

Every local CSS and JS link carries a `?v=` date tag; bump it on every page
when a CSS or JS file changes. `_headers` lets browsers keep CSS and JS for a
year on the strength of that tag, so a change without a new tag never reaches
a returning visitor.

Every stylesheet is linked directly from each page so the browser fetches them
in parallel rather than discovering them through `@import`. `style.css` is
loaded last and holds only global overrides.

## SEO

Markup that matters to a crawler is in the HTML, not generated at runtime: the
navigation, so the internal link graph exists without JavaScript, and the work
list, so the projects are readable by social link-preview bots and by anything
that indexes before it renders.

Each indexable page also carries a `rel="canonical"` (the same content is
served at both `/` and `/index.html`, and on the `workers.dev` preview), a description under 160 characters, Open Graph and Twitter card
tags (including `og:site_name`, `og:locale` and image alt text; case studies
are `og:type` `article` with published and modified times), and a JSON-LD
`@graph`. Nodes share stable `@id`s across pages so search engines and AI
answer engines merge them into one entity:

- `https://ryanyarali.com/#ryan`: the `Person` (full on the home page, a stub
  elsewhere), with `alumniOf` and a dated `affiliation` role pointing at
  `#bcit`, the `CollegeOrUniversity` node
- `#site`: the `WebSite`; `/#page`: the home `ProfilePage`
- each project: `projects/nooklook.html#project`, `projects/taskmate.html#project`,
  `projects.html#vancobab`, `projects.html#termeh`, listed in an `ItemList` on
  the home page and on `projects.html` (a `CollectionPage`)
- each case study: a `WebPage` (`#page`), an `Article` (`#article`) about its
  project, and a `BreadcrumbList` (`#breadcrumb`)

When a project changes, update its node in every page that carries it (the
home page, `projects.html`, and its case study), as with the HTML itself.

`404.html` carries `noindex, nofollow` and stays out of the sitemap;
`resume.html` is `noindex, follow` until the PDF exists. Both stay crawlable in
`robots.txt`, since a crawler has to fetch a page to see its `noindex`.

`robots.txt` allows everything and names the main AI search and assistant
crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended and others)
explicitly. `llms.txt` is a plain-Markdown summary of who Ryan is, his
projects and links, following the [llms.txt](https://llmstxt.org) convention
for language models; keep it in step with the site when the facts change.
The sitemap lists each page's main image.

Every `<img>` has `width` and `height` so the browser reserves the box before
the file lands, which keeps layout shift out of Core Web Vitals.

## Design system

Everything is driven by CSS custom properties defined in
`assets/css/tokens.css`. The light palette lives on `:root` and dark mode
overrides those same variables under `html[data-theme="dark"]`, so themes stay
in sync by construction.

- **Colour:** one colour story in light and dark: neutral near-black and
  off-white, and a single electric blue (`#2450f5` light, `#4d7aff` dark) kept
  rare on purpose, for Ping, the route, the name and the main button. Both
  themes clear WCAG AA (4.5:1) for body, muted and subtle text and for the
  accent.
- **Type:** Familjen Grotesk for headings and UI, IBM Plex Mono for labels,
  indices, and figures, both from Google Fonts.
- **Theme:** a small inline script in each `<head>` sets `data-theme` before
  first paint so the correct theme renders immediately. `theme.js` then wires
  up the switch in the nav and follows the system setting until the visitor
  overrides it.

To change the colours or the fonts, edit `tokens.css`. Nothing else
hardcodes a colour or font.

## Interaction

- **Intro:** on a first visit, a TCP handshake prints before the page is
  revealed (about 1.2s; any click, scroll or key skips it). The connection
  time it shows is real, from the Navigation Timing API.
- **Hero globe:** a three.js scene whose labelled nodes are the projects and
  the tools they are built with, linked by their real relationships. It loads
  after the page has finished loading, renders only while the hero is on
  screen, follows the theme, and falls back to a CSS poster without WebGL
  or with Data Saver on.
- **Stacking:** on the home page each section slides up over the last,
  which sinks back and fades toward the page colour. Sections taller than the
  screen scroll through first, then hold. In-page links scroll to a section's
  place in the flow, since a stuck section's own box is not where it lives.
- **Route:** a line that winds down the page like a timeline: down one
  edge of a section, across the open space above the next heading, and on.
  Square pixel dots show the road ahead; the solid line glides in behind a
  packet that rides at the reading line (eased, so it stays smooth when a
  phone delivers scroll unevenly), with a three-step comet fading out behind
  it, lighting each heading as a hop. Points along the path come from a
  precomputed table, and the hosts are measured in the scroll event before
  anything writes, so a frame never forces the page to lay out again. On
  the stacked home page each section carries its own stretch, so the line
  moves with its card; under the pinned gallery it runs sideways with the
  cards. Case studies weave between their sections. On phones the packet
  carries the current hop's name while the page moves.
- **Ping:** the packet at the head of the route is a little creature (a
  ping says hello; the answer is a pong), drawn as a pixel-art sprite
  (`ping-sprite.js`, 19 x 22 on a hard grid) in three shades of the accent
  with a navy outline. Every state is a frame swapped in
  steps, like a game sprite: blinking, glancing, talking, waving, cheering,
  walking while the page scrolls, happy, asleep, dizzy, and carrying the
  contact form's real request in an envelope. He grows big at the end of the
  route to wave goodbye. On the home page he speaks only at the hello, the
  projects and contact stops and the goodbye; each line is a retro RPG dialog
  box docked in the bottom corner on his side, joined to him by a dotted
  wire, so it never jumps around over the content. Pages without a route
  (404, résumé, projects) have him standing by the heading. He is
  aria-hidden, and holds still under reduced motion.
- **Headings:** eyebrows decode out of random characters, and a glowing scan
  line sweeps across each heading, revealing the text behind it.
- **Hero name:** fills the column; its letters rise one after another on
  load, and as the next section slides over the hero it shrinks and flies up
  into the nav, cross-fading into the logo.
- **Big titles:** the projects page, case study and contact titles rise
  letter by letter as they come into view (flair.js splits them, keeping the
  real text as the accessible name).
- **Weight lens:** on a fine pointer, the hero name and the footer wordmark
  thin under the pointer, letter by letter (the variable Familjen Grotesk,
  400 to 700); the wordmark's letters also turn blue. Letters keep their
  resting width, so nothing around them moves.
- **Skills:** the marquee (which speeds up while the page is scrolled fast)
  drifts above a ruled grid of tiles, one per area,
  each with a 12 x 12 pixel icon that boots in pixel by pixel and animates in
  two frames while its tile is hovered (or, on a phone, mid-screen).
- **Terminal:** Ctrl K / Cmd K (or the footer button) opens a small terminal
  that filters commands as you type: every section, case study and profile,
  plus the theme switch. A shortcut over links that already exist.
- **Projects page:** a giant title, big index rows, and on a fine pointer the
  hovered project's cover floats beside the cursor.
- **Case studies:** the cover drifts as it scrolls past, screenshots wipe up
  into their frames, and each ends on the next case study, set big.
- **Footer:** the name set as wide as the screen, cropped, its letters
  rising as the footer scrolls in.
- **About:** the lede lights up word by word as it is read, and the portrait
  tilts toward the pointer.
- **Cursor ring:** follows the real pointer (which stays visible), wraps
  buttons, and reads "View" or "Drag" over images and the globe. Fine
  pointers only.
- **Ambient trace:** a canvas line whose amplitude tracks scroll velocity. The
  input is scroll, not cursor position, so it behaves identically under touch.
- **Project accordion:** one row per project, opened by a tap, one open at a
  time. Rows without a screenshot draw a canvas figure seeded by the project
  key and coloured from the live palette.
- **Magnetic buttons:** gated behind `(hover: hover) and (pointer: fine)`, so
  they are purely additive and never a requirement.

Everything except the magnetic buttons works on a phone, and everything
respects `prefers-reduced-motion`.

## Adding a project

The work list is plain HTML, not generated. Copy an existing
`.work-card` in `index.html` and an existing `.project-accordion-item` in
`projects.html`, and edit **both**, keeping the `id` on the panel unique per page and matching the
`aria-controls` on its button. Then add the project's JSON-LD node to the
`ItemList` on both pages (see SEO above), a line to `llms.txt`, and, for a
new case study, a `sitemap.xml` entry.

It used to be rendered from a data object in JavaScript. That cost more than it
saved: with the markup generated at runtime, any crawler that does not execute
JavaScript, which includes every social link-preview bot, saw a page with no
projects on it at all. Four projects in two files is the cheaper trade.

If a project has a screenshot, point the `<img>` at it and give it real `width`
and `height` attributes. If it does not, leave the `<canvas data-art="...">` in
place and `interactive.js` draws a figure seeded by that key.


## Contact form and pricing

The pricing section and the form share one set of prices. They are written in
`index.html` (shown in the section, and as `data-` attributes on the form's
inputs, which `assets/js/form.js` adds up into the estimate) and in
`worker/catalog.js` (used in the emails). `node --test test/*.test.js` fails
if the two disagree, so change both together.

The form posts JSON to `/api/contact`, handled by `worker/index.js`:

1. checks the origin, a hidden honeypot field and Cloudflare Turnstile;
2. validates every field again on the server;
3. allows five messages an hour per visitor (by salted IP hash);
4. saves the message to D1 (`messages` table), so nothing is lost if email
   fails;
5. texts Ryan on Telegram (below), or emails him through Resend if the bot
   isn't set up or can't send;
6. sends the sender a thank-you, at most one per address a day. It repeats
   only what they picked from fixed lists, never their own words.

## The Telegram bot

`worker/telegram.js`, fed by `worker/visits.js` and `assets/js/hit.js` (one
beacon per page view, no cookies; visitors are a salted hash of IP and
browser that changes daily; Do Not Track is respected; `?notrack=1` stops
counting a device). It only talks to `TELEGRAM_CHAT_ID`.

- **Leads**: every message, with the estimate, the referral (and whether the
  referrer is a past client), where the sender came from (credit tag, friend
  link, Google, ChatGPT...), the pages they viewed and their time on the site.
  Buttons: Reply, Call booked, Won, Not a fit. Reply to a lead in Telegram
  and the bot shows a preview, then emails it from ryan@ryanyarali.com.
- **Live alerts**: someone arrived from a credit tag (`?ref=` on client
  sites), a friend link (`?friend=`) or an AI answer. `/alerts` toggles them.
- **Commands**: `/stats`, `/now`, `/leads`, `/refs` (who to pay the $50),
  `/alerts`, `/ignoreme`, `/help`.
- **Every morning at 9** (cron, B.C. time): yesterday's numbers and any
  lead still waiting after a day.

Set it up: make a bot with @BotFather, `wrangler secret put` the token and a
random `TELEGRAM_WEBHOOK_SECRET`, open `/api/telegram/setup?key=<secret>`,
message the bot (it replies with your chat id), `wrangler secret put
TELEGRAM_CHAT_ID`, and open the setup link again.

Run it locally with `npx wrangler d1 migrations apply ryanyarali --local` once,
then `npx wrangler dev`. With no `RESEND_API_KEY` the emails are logged
instead of sent, and with no `TURNSTILE_SECRET` the bot check is skipped. The
secrets are listed at the top of `wrangler.jsonc`.

Read the saved messages with
`npx wrangler d1 execute ryanyarali --remote --command "select * from messages order by id desc limit 20"`.

## Accessibility

- Semantic landmarks, a skip-to-content link, and visible focus indicators
- Labelled form fields with inline, non-blocking error messages
- Scroll-reveal animations fall back to visible content, and all motion is
  disabled under `prefers-reduced-motion`

## License

MIT. Feel free to borrow from it.
