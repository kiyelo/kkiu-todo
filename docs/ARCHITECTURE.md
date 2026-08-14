# KKiu Todo runtime architecture

This document records the boundaries that are easy to accidentally break while changing the app.

## Source and generated output

- Runtime source lives under `app/`.
- Vite uses `app/` as its root and generates `dist/`.
- GitHub Pages publishes `dist/`; Android builds the same app source through Capacitor.
- Root `index.html`, `404.html`, and hashed `assets/` are generated output and must not be committed.

## Runtime entrypoints

- `app/src/main.jsx` mounts React and imports two runtime entrypoints:
  - `app/src/styles/index.css`
  - `app/src/interactions/reorderHighlight.js`
- `styles/index.css` owns stylesheet order. Base parity CSS loads first; focused feature overrides load after it.

## Queue scrolling

- `.qvp` is the only native vertical scroll owner for Queue, Circle Queue, and More.
- Floating controls belong inside `.qvp` through a zero-height sticky `.queue-floating-layer`.
- Do not add a JS momentum proxy, transparent hit surface, second scroll owner, or counter-translated scroll surface.
- Text input remains input-owned; surrounding floating controls use native `pan-y`.

## Task reorder

- A grip swipe before the hold arms stays native scrolling.
- A stationary hold arms reorder and haptic feedback.
- Once armed, reorder owns touch movement and may edge-auto-scroll the native `.qvp`.
- Neighboring cards may move while dragging.
- Pointer release commits immediately. Do not add post-drop FLIP, snap animation, synthetic wheel, or scroll correction.
- `interactions/reorderHighlight.js` is visual feedback only. It must not own layout or scroll.

## Task target highlight

`styles/taskHighlight.css` owns the visual language for these trigger classes:

- `new-hit`: newly created task
- `search-hit`: active task reached from search
- `target-hit`: completed task reached from search
- `reorder-hit`: task after reorder completes
- `success-highlight`: generic reusable task success cue

The shared cue is green outline + green marker only. It must not alter background, brightness, opacity, scale, translation, layout, or scroll position. This keeps light, dark, and system-dark surfaces stable.

## Verification

- `pnpm run test:stress`: data/backup stress cases.
- `pnpm run test:release-config`: current release/platform invariants.
- `pnpm run test:architecture`: source-boundary and queue/highlight architecture invariants.
- `pnpm run verify:checks`: runs all three.
- `.github/workflows/verify.yml`: runs verification plus a web build for pull requests.
- `.github/workflows/android.yml`: builds and signs an APK from the same source.

When a refactor intentionally changes one of these boundaries, update the implementation and the corresponding behavior-level test together. Do not keep a test that merely searches for an obsolete implementation string.
