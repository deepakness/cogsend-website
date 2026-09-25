/**
 * What `scripts/sync-docs.mjs` recorded about the app it read the docs from.
 *
 * `import.meta.glob` rather than a plain import: the file is generated and
 * gitignored, and an eager glob over a missing file is an empty object instead
 * of a build error. The sync runs before every `dev`, `check` and `build`, so in
 * practice it is always there.
 */
const files = import.meta.glob<{ ref: string; version: string | null }>(
	'../content/docs/meta.json',
	{ eager: true, import: 'default' }
);

const meta = Object.values(files)[0];

/** The app's `package.json` version, e.g. `1.3.0`, or null when unknown. */
export const APP_VERSION: string | null = meta?.version ?? null;

/** The git ref the docs were read at when fetched, `main` by default. */
export const DOCS_REF: string = meta?.ref ?? 'main';
