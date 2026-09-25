# Contributing

Thanks for helping. Two things decide where a change goes.

## Docs: change them in the app repo

The pages under [cogsend.com/docs](https://cogsend.com/docs/) are written in the
app repository's [`docs/`](https://github.com/deepakness/cogsend/tree/main/docs)
folder and copied here at build time. A fix to what a page *says* is a pull
request there; every page has an "Edit" link that goes straight to its file.

This repository owns how the docs *look and are arranged*: the sidebar and page
titles (`src/docs/nav.mjs`), the site-only additions such as screenshots and
"where to go next" (`src/docs/extras/`), and the styles (`src/styles/docs.css`).

## Everything else: here

```sh
npm install
npm run dev
```

`npm run dev` reads the docs from a sibling checkout at `../cogsend` when there is
one, and from GitHub otherwise, so a clone of this repository works on its own.

Before opening a pull request:

```sh
npm run check
npm run build
npm run preview
npm run check:a11y
```

`check:a11y` needs the preview running in another terminal. CI runs the same
checks on every pull request.

The rules that matter most are in [AGENTS.md](AGENTS.md): the app is the source of
truth for copy, the mocks quote the app's real labels, every outbound URL lives in
`src/config.ts`, no new runtime dependencies, and light mode only.

Commits follow [Conventional Commits](https://www.conventionalcommits.org/), one
logical change each, with scopes `site`, `components`, `seo`, `ci`, `a11y` or
`docs`.

Deploying is done by the maintainer; `npm run deploy` needs access to the
Cloudflare account.
