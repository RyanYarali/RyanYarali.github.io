# ryanyarali.com

Personal portfolio site for Ryan Yarali, a Computer Systems Technology student
at BCIT. Built with plain HTML, CSS, and JavaScript. No framework, no build
step, no dependencies to install.

Live at [ryanyarali.com](https://ryanyarali.com), deployed from this repository
via GitHub Pages.

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
assets/
  css/
    style.css         Global overrides, loaded last
    tokens.css        Design tokens: colour, type, spacing, radii, shadows
    reset.css         Baseline reset and focus styles
    typography.css    Type scale and text utilities
    layout.css        Navigation, sections, footer, scroll reveal
    components.css    Buttons, forms, tags, cards
    interactive.css   Ambient trace, palette dock, stat strip, project accordion
    pages.css         Page- and section-specific styles
  js/
    theme.js          Light/dark theme with system preference + persistence
    palette.js        Six colour palettes and the palette dock
    form.js           Contact form validation and submission
    main.js           Mobile menu, scroll reveal, active nav, back to top
    interactive.js    Ambient trace, counters, accordion, skills filter
CNAME, robots.txt, sitemap.xml, favicon.svg
```

Every stylesheet is linked directly from each page so the browser fetches them
in parallel rather than discovering them through `@import`. `style.css` is
loaded last and holds only global overrides.

## SEO

Markup that matters to a crawler is in the HTML, not generated at runtime: the
navigation, so the internal link graph exists without JavaScript, and the work
list, so the projects are readable by social link-preview bots and by anything
that indexes before it renders.

Each indexable page also carries a `rel="canonical"` (GitHub Pages serves the
same content on the apex domain and on `*.github.io`, and at both `/` and
`/index.html`), a description under 160 characters, Open Graph and Twitter card
tags, and a JSON-LD block: `Person` plus `WebSite` and `ProfilePage` on the home
page, `CollectionPage` on the project list, and `Article` on each case study.
`404.html` carries `noindex, nofollow` and stays out of the sitemap.

Every `<img>` has `width` and `height` so the browser reserves the box before
the file lands, which keeps layout shift out of Core Web Vitals.

## Design system

Everything is driven by CSS custom properties defined in
`assets/css/tokens.css`. The light palette lives on `:root` and dark mode
overrides those same variables under `html[data-theme="dark"]`, so themes stay
in sync by construction.

- **Colour:** six palettes (Ocean, Violet, Emerald, Crimson, Cyan, Magenta),
  each with a light and a dark variant. Ocean is the default and lives in
  `tokens.css`; `palette.js` carries the other five and swaps them at runtime by
  writing one `<style>` block that redefines the same variables. All twelve
  variants clear WCAG AA (4.5:1) for body, muted, and subtle text and for the
  accent on both grounds.
- **Type:** Familjen Grotesk for headings and UI, IBM Plex Mono for labels,
  indices, and figures, both from Google Fonts.
- **Theme:** a small inline script in each `<head>` sets `data-theme` before
  first paint so the correct theme renders immediately, and `palette.js` is
  loaded in the `<head>` for the same reason. `theme.js` then wires up the
  toggle and follows the system setting until the visitor overrides it.

To change the default palette or the fonts, edit `tokens.css`; to change the
palette list, edit `palette.js`. Nothing else hardcodes a colour or font.

## Interaction

- **Ambient trace:** a canvas line whose amplitude tracks scroll velocity. The
  input is scroll, not cursor position, so it behaves identically under touch.
- **Project accordion:** one row per project, opened by a tap, one open at a
  time. Rows without a screenshot draw a canvas figure seeded by the project
  key and coloured from the live palette.
- **Skills filter:** the category chips dim the rows that do not match.
- **Magnetic buttons:** gated behind `(hover: hover) and (pointer: fine)`, so
  they are purely additive and never a requirement.

Everything except the magnetic buttons works on a phone, and everything
respects `prefers-reduced-motion`.

## Adding a project

The work list is plain HTML, not generated. Copy an existing
`.project-accordion-item` block and edit it in **both** `index.html` and
`projects.html`, keeping the `id` on the panel unique per page and matching the
`aria-controls` on its button.

It used to be rendered from a data object in JavaScript. That cost more than it
saved: with the markup generated at runtime, any crawler that does not execute
JavaScript, which includes every social link-preview bot, saw a page with no
projects on it at all. Four projects in two files is the cheaper trade.

If a project has a screenshot, point the `<img>` at it and give it real `width`
and `height` attributes. If it does not, leave the `<canvas data-art="...">` in
place and `interactive.js` draws a figure seeded by that key.


## Contact form

The form posts to [Formspree](https://formspree.io). To point it at a
different endpoint, change the `action` attribute on the form in `index.html`.
Validation and submission are handled client-side in `assets/js/form.js`.

## Accessibility

- Semantic landmarks, a skip-to-content link, and visible focus indicators
- Labelled form fields with inline, non-blocking error messages
- Scroll-reveal animations fall back to visible content, and all motion is
  disabled under `prefers-reduced-motion`

## License

MIT. Feel free to borrow from it.
