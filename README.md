# cogsend.com

The marketing site for [CogSend](https://github.com/deepakness/cogsend) — a
self-hosted social scheduler for Mastodon, Bluesky, LinkedIn, Threads and X.

There are two halves: the homepage, and `/docs`. The docs are written in the app
repo's `docs/` folder and rendered here by `scripts/sync-docs.mjs`, so the app
stays the source of truth for the words and this repo owns how they read.

Found a mistake in the docs? Fix it in the app repo's
[`docs/`](https://github.com/deepakness/cogsend/tree/main/docs) folder. Anything
about the site itself is a pull request here; see [CONTRIBUTING.md](CONTRIBUTING.md).

The page is `Header → Hero → Features → Install → Faq → Cta → Footer`, with `Cta`
and `Footer` shared by `404.astro`. The 404 is served with `noindex` and no
canonical because its URL is whatever the visitor typed.

`Faq.astro` answers the questions a reader has before deploying, starting with
what it costs. That answer used to be a card inside `Install`, which restated
Cloudflare's published free-tier numbers: they rot on Cloudflare's schedule, and
they answer a question nobody asked. The numbers now live in one place, phrased
as consequences, and link to Cloudflare rather than copying it.

## Running it

```sh
npm install
npm run dev          # http://localhost:4321
```

| Command           | What it does                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `npm run dev`     | Dev server with hot reload                                       |
| `npm run build`   | Static build into `dist/`, then the Pagefind search index        |
| `npm run preview` | Serves the built output locally                                  |
| `npm run check`   | `astro check` — types and template errors                        |
| `npm run docs:sync` | Rebuilds `src/content/docs/` from the app repo's `docs/`        |
| `npm run docs:check` | The same, reporting drift and writing nothing                  |
| `npm run check:a11y` | axe-core over every built page; needs `npm run preview` running |
| `npm run og`      | Redraws `public/og.png` (a text card, drawn from the hero)        |
| `npm run deploy`  | Build, then deploy `dist/` to Cloudflare Pages (maintainer only)   |

`.github/workflows/ci.yml` runs `check`, `build` and `check:a11y` on every push
and pull request, so a contrast or labelling regression fails the build rather
than reaching the site.

## Stack

Astro 7 with Tailwind 4, fully static — no adapter, because nothing renders on a
server. Output lands in `dist/`, which `wrangler.jsonc` uploads to Cloudflare
Pages (the `cogsend-website` project). `npm run dev` is the local server.

There is deliberately no component framework on top. Everything interactive is
vanilla TypeScript in the component that owns it: the copy button
(`CopyCommand.astro`, delegated from `document` so every `[data-copy]` button
shares one listener), the simulated composer (`MockEditor.astro`), the demo
dialog (`Hero.astro`), and on the docs side the search box (`DocsSearch.astro`)
and the table of contents (`DocsToc.astro`).

The one build dependency beyond Astro is **Pagefind**, which indexes `dist/`
after `astro build` and serves the docs search from our own origin — no
third-party service, so the CSP is unchanged. It is a build step, not a runtime
dependency: nothing ships to the browser except a small module fetched on the
first keystroke.

`public/_headers` carries the security headers and cache policy Cloudflare
applies to the uploaded assets. It is copied into `dist/` and applied by
Cloudflare Pages.

`astro preview` serves `dist/` and sends **none** of those headers, so a change
that only breaks under the policy looks fine locally. It has happened once:
Pagefind's WebAssembly was blocked by `script-src` until `'wasm-unsafe-eval'`
was added, and the search box worked in preview and failed in production.

`npm run preview:pages` runs `wrangler pages dev dist` instead: same output, but
with `_headers` applied, Pages' 404 and its 308 for a directory path — the local
loop that matches production. Anything header-sensitive (a new origin, WASM, a
`frame-src` embed) belongs there, and `npm run check:a11y http://localhost:8788`
audits it. `npm run check:a11y` also prints a note when the origin it audits
sends no CSP, for exactly this reason.

## Docs

`/docs` is the app's manual, rendered here. The prose is not copied into this
repo: `scripts/sync-docs.mjs` reads the app's `docs/` folder, rewrites its
relative links into site ones, splices in the site-only additions, and writes
`src/content/docs/` — which is gitignored and rebuilt by `predev`, `precheck` and
`prebuild`. Locally it reads the sibling checkout at `../cogsend/docs`; CI has no
sibling, so it falls back to `raw.githubusercontent.com` at `DOCS_REF` (default
`main`).

`src/docs/nav.mjs` is the other half of that contract: the sidebar order, the
group a page sits in, its title, its one-line description, and which file in the
app it comes from. A doc with no nav entry, a nav entry with no doc, a link to a
page that does not exist, or an extras block anchored to a heading that has been
renamed each fail the sync with a message naming the file.

### Site-only additions

Anything this site wants that the app repo should not carry — a screenshot, a
clip, a "where to go next" — lives in `src/docs/extras/<slug>.md`. It is plain
markdown with two markers:

```md
<!-- docs:after "Backups" -->     inserted right after that heading
...content...
<!-- docs:end -->

<!-- docs:page -->               inserted at the top of the page
...content...
<!-- docs:end -->
```

Content outside a marker block is appended to the end of the page, which is where
the "Where to go next" links live. Anchors match on heading text, so an edit
above them in the app's doc cannot break them; a renamed heading fails the build
instead of silently dropping the block.

### Screenshots, video and YouTube

Put a file in `public/shots/` and reference it by path. Markdown in the docs
collection is gitignored, so Tailwind never scans it — style comes from
`src/styles/docs.css`, and a utility class written in a doc would do nothing:

```html
<figure>
  <picture>
    <source srcset="/shots/posts.webp" type="image/webp" />
    <img src="/shots/posts.png" alt="…" width="1760" height="1280" loading="lazy" />
  </picture>
  <figcaption>…</figcaption>
</figure>
```

A clip is a plain `<video controls playsinline preload="metadata">` pointing at
`assets.deepakness.com`, which `media-src` already allows. A YouTube embed is an
`<iframe src="https://www.youtube-nocookie.com/embed/ID" title="…"
loading="lazy" allowfullscreen>` — `frame-src` in `public/_headers` names that
origin, and a poster image from `i.ytimg.com` would need it added to `img-src`.
Both get a 16:9 box from the prose styles, so nothing jumps when they load.

### Search

Pagefind indexes `/docs/**` after the build, so search works in `npm run preview`
and in production but not in `astro dev` — the box is left out there rather than
sitting on the page doing nothing. `DocsSearch.astro` calls Pagefind's API and
renders its own list.

Its loader is an `is:inline` script on purpose: Pagefind's file does not exist
while Vite is bundling the page, and a bundled dynamic import of a path it cannot
resolve is rewritten into a preload helper pointing at nothing.

## Analytics

`Layout.astro` renders both beacons, so every page is covered without a page
having to remember anything:

- **Umami**, self-hosted on `umami.vempus.com`, is always on. The script, the
  website id and the tracked hostname are the `UMAMI` constant in
  `src/config.ts`. `data-domains="cogsend.com"` is an exact hostname match in
  the tracker, so `npm run dev`, `npm run preview` and the CI a11y run — all of
  which load the built page over localhost — are not counted.
- **Cloudflare Web Analytics** renders only when `CF_ANALYTICS_TOKEN` is set.

An analytics origin has to be named in the CSP in `public/_headers` twice: in
`script-src` for the tag, and in `connect-src` for the beacon it posts back.
Umami needs both because its tracker sends to the host that served it.

## Design

The site borrows the app's visual language rather than inventing one, so the two
read as the same product. The tokens live in `src/styles/global.css` and were
lifted from the app's `src/routes/layout.css` and its Tailwind stone classes:

- Page `#fafaf9`, ink `#0c0c0e`, hairlines `#e8e8ec`, selection `#b9d9ff`
- The app's shadow recipes, tinted with the ink colour instead of black
- The system font stack, no webfonts
- Pills are `rounded-full`, cards `rounded-[1.5rem]` to `rounded-[2rem]`
- Light only, like the app

Platform marks live in `src/components/SocialIcon.astro`, copied from the app's
`src/lib/domain/platform-marks.ts`. Every mark on the page is drawn through that
one component, so a mark cannot be drawn two ways here. If one changes in the
app, change it in `SocialIcon.astro`.

The wordmark is `src/components/Logo.astro`, the same **Cog Four** path as the
favicons, so the header cannot drift from the tab icon.

### The mocks

`MockEditor.astro` and the two blocks in `Features.astro` are hand-built pictures
of the app, not the app. Two rules keep them honest:

- **Copy is quoted from the app.** Every string, tab, badge and action label
  exists in the app's own source — `Editor.svelte`, `posts/+page.svelte`,
  `insights/+page.svelte`. Nothing invented goes in, and a label that the app
  does not have is a bug here.
- **They are `aria-hidden="true"` and every control inside carries
  `tabindex="-1"`.** They are decorative, so nobody should be able to reach a
  fake control by keyboard or hear one read out. Mouse hover still works, which
  is the point of the mock. Dropping `tabindex="-1"` from a control inside one of
  these blocks makes `npm run check:a11y` fail with `aria-hidden-focus`.

The icon set is the project's **Cog Four** export — a four-tooth cog with a round
bore on a 15/64 squircle. Its paths are byte-identical to the app's own favicon,
so the two cannot drift:

| File in `public/` | Source in the icon set |
| --- | --- |
| `favicon.svg` | `svg/cog-four-tile-ink.svg` |
| `favicon-dark.svg` | `svg/cog-four-tile-white.svg` |
| `favicon.ico` | `ico/cog-four-tile-ink.ico` (16/32/48) |
| `apple-touch-icon.png` | `png/tile-ink/cog-four-tile-ink-180.png` |
| `icon-192.png`, `icon-512.png` | `png/tile-ink/…-192.png`, `…-512.png`, listed in `site.webmanifest` |

The set's `glyph-*` files (transparent, cropped tight) are for the app's own
16–24 px in-app mark; the site uses the tile versions everywhere.

## Screenshots

`public/shots/` holds real captures of the app, taken from a local instance
with demo data in its local D1. Each is a PNG with a WebP beside it, and the docs
reference both through `<picture>`: `composer` on Writing and publishing,
`posts` on Scheduling, `insights` on Posts and Insights, and `accounts` on
Connecting accounts. They are also the honest fallback if a hand-built mock ever
has to be replaced with the real thing. A new capture needs its WebP too; `sharp`
is already installed with Astro.

To retake them: run the app locally (`npm run dev` in the cogsend checkout), seed
an account with `npm run db:seed:local`, then capture with Playwright. The hero
is the composer at a 900×700 viewport, clipped to `x:40 y:128 w:820 h:546` so the
app's own header stays out of frame.

## Editing the page

Two conventions matter more than they look:

- **`data-reveal` hides content until it scrolls into view.** The CSS is scoped
  to `html.js` so no-JS visitors still see everything, and `@media print` forces
  every block visible — without that rule a saved PDF comes out blank.
- **Anything below the fold is `opacity: 0` until observed**, which axe skips.
  `scripts/check-a11y.mjs` scrolls the page and pins transitions before it
  audits, so the gate sees what a reader sees. Keep that ordering.

## Links

Every outbound URL lives in `src/config.ts`. `LINKS.docs` and its siblings point
at `/docs/…` on this site now, and the docs themselves carry the app repo's own
links, rewritten by the sync.

The app repo still sends its own readers to GitHub (`src/lib/domain/platform-setup.ts`,
the strings `scripts/setup.mjs` and `scripts/doctor.mjs` print, the Settings
link). Pointing those here is a change in that repo, not this one, and nothing
here depends on it.

`INSTALL_COMMAND` lives there too and is the app README's two-line install block
joined with `&&`, so one paste installs. It is the one string on the site that has
to match the app exactly; if the app's README changes, change it here.

## License

[MIT](LICENSE), same as the app. Security reports: [SECURITY.md](SECURITY.md).
