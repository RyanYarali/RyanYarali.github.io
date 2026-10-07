# three.js r186 (vendored)

Used only by `assets/js/hero-globe.js`, which loads it with a dynamic
`import()` after the page has finished loading, so it never delays first paint.

- Source: the `three@0.186.1` npm package, minified build as served by jsDelivr
  (`/npm/three@0.186.1/build/three.module.min.js` and `three.core.min.js`).
- One local edit: `three.module.min.js` imports `./three.core.js`; that path is
  rewritten to `./three.core.min.js` so the two minified files pair up.
- Licence: MIT, see `LICENSE`.

To upgrade, download both files for the new version, repeat the one-line
import rewrite, and update this note.
