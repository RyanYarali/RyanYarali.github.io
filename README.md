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
  taskmate.html
  portfolio.html
404.html              Custom not-found page
assets/
  css/
    style.css         Entry point; imports tokens, layout, components, pages
    tokens.css        Design tokens: colour, type, spacing, radii, shadows
    reset.css         Baseline reset and focus styles
    typography.css    Type scale and text utilities
    layout.css        Navigation, sections, footer, scroll reveal
    components.css    Buttons, forms, tags, project rows, cards
    pages.css         Page- and section-specific styles
  js/
    navbar.js         Renders the shared nav on every page
    theme.js          Light/dark theme with system preference + persistence
    projects.js       Project data and list rendering
    form.js           Contact form validation and submission
    main.js           Mobile menu, scroll reveal, active nav, back to top
CNAME, robots.txt, sitemap.xml, favicon.svg
```

`reset.css`, `typography.css`, and `style.css` are linked from each page;
`style.css` pulls in the remaining stylesheets with `@import`.

## Design system

Everything is driven by CSS custom properties defined in
`assets/css/tokens.css`. The light palette lives on `:root` and dark mode
overrides those same variables under `html[data-theme="dark"]`, so themes stay
in sync by construction.

- **Colour:** a single ink-navy accent on white, inverted to pale steel blue
  on navy-black in dark mode.
- **Type:** Source Serif 4 for headings and pull quotes, Inter for body and
  UI, both from Google Fonts.
- **Theme:** a small inline script in each `<head>` sets `data-theme` before
  first paint so the correct theme renders immediately. `theme.js` then wires
  up the toggle and follows the system setting until the visitor overrides it.

To change the palette or fonts, edit `tokens.css`; nothing else hardcodes a
colour or font family.

## Adding a project

1. Add an entry to `projectsData` in `assets/js/projects.js` (title, tagline,
   outcome, tech, image, url).
2. Create the case study page under `projects/`, using an existing one as the
   template.
3. Add the new URL to `sitemap.xml`.

Projects with `featured: true` also appear on the home page.

## Contact form

The form posts to [Formspree](https://formspree.io). To point it at a
different endpoint, change the `action` attribute on the form in `index.html`.
Validation and submission are handled client-side in `assets/js/form.js`.

## Accessibility

- Semantic landmarks, a skip-to-content link, and visible focus indicators
- Labelled form fields with inline, non-blocking error messages
- Scroll-reveal animations fall back to visible content, and all motion is
  disabled under `prefers-reduced-motion`

## Note on `.agents/` and `.claude/`

These directories hold agent skill definitions installed into the repository.
They are development tooling and have no effect on the published site.

## License

MIT. Feel free to borrow from it.
