#!/usr/bin/env node
/**
 * Builds `src/content/docs/` from the app repo's `docs/` folder.
 *
 *     node scripts/sync-docs.mjs              # write the pages
 *     node scripts/sync-docs.mjs --check      # report drift, write nothing
 *     DOCS_SOURCE=../cogsend/docs node scripts/sync-docs.mjs
 *     DOCS_REF=v1.2.2 node scripts/sync-docs.mjs
 *
 * The app repo owns the words; this site owns how they look and what they are
 * called. So the sync does four narrow things and refuses to guess about
 * anything else:
 *
 *   1. Copies each `docs/<source>.md` named in `src/docs/nav.mjs`, minus the
 *      app's own H1 — the page's H1 is the nav title, so the two can never
 *      drift into two different titles for one page.
 *   2. Rewrites the app's relative links (`deploy.md#backups`) into site ones
 *      (`/docs/deploy/#backups`), and links that escape the docs folder
 *      (`../CONTRIBUTING.md`) into GitHub ones.
 *   3. Splices in `src/docs/extras/<slug>.md`, which is where site-only detail
 *      lives: screenshots, video, worked examples. An extras file can insert
 *      after any heading, or at the top of the page, and it is addressed by
 *      heading text rather than by line number, so it survives edits above it.
 *   4. Fails loudly when any of that stops making sense — a doc with no nav
 *      entry, a nav entry with no doc, a link to a page that does not exist, an
 *      extras block anchored to a heading that has been renamed — and warns
 *      about the things that would otherwise ship broken quietly: a doc with no
 *      H1, a relative link the rewriter could not read, an image this site has
 *      no copy of.
 *
 * The output directory is gitignored and rebuilt on every `dev`, `check` and
 * `build`, so there is exactly one copy of the prose and it lives in the app.
 *
 * Local runs read `../cogsend/docs` (a sibling checkout). CI has no sibling, so
 * it falls back to raw.githubusercontent.com at DOCS_REF — the one thing a
 * build of this site needs from outside itself.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS_ORDER } from '../src/docs/nav.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(root, 'src/content/docs');
const EXTRAS_DIR = join(root, 'src/docs/extras');

const REPO = 'deepakness/cogsend';
const REF = process.env.DOCS_REF ?? 'main';
const BLOB = `https://github.com/${REPO}/blob/${REF}`;
const RAW = `https://raw.githubusercontent.com/${REPO}/${REF}/docs`;

/** What counts as an asset rather than a page, for the messages below. */
const ASSET = /\.(png|jpe?g|gif|webp|avif|svg|mp4|webm)$/i;

const CHECK = process.argv.includes('--check');
const warnings = [];
const written = [];
const unchanged = [];

// ---------------------------------------------------------------- sources

/** The sibling checkout, an explicit DOCS_SOURCE, or null for the network. */
function localSource() {
	const explicit = process.env.DOCS_SOURCE;
	if (explicit) {
		const dir = resolve(root, explicit);
		if (!existsSync(dir)) throw new Error(`DOCS_SOURCE points at ${dir}, which does not exist.`);
		return dir;
	}
	const sibling = resolve(root, '../cogsend/docs');
	return existsSync(sibling) ? sibling : null;
}

async function readSource(dir, item) {
	if (dir) {
		const file = join(dir, item.source);
		if (!existsSync(file)) {
			throw new Error(
				`${item.source} is in src/docs/nav.mjs but not in ${dir}. A nav entry and a doc have to move together.`
			);
		}
		return readFileSync(file, 'utf8');
	}
	const url = `${RAW}/${item.source}`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(
			`${url} answered ${res.status}. Set DOCS_REF to a tag, or point DOCS_SOURCE at a checkout.`
		);
	}
	return res.text();
}

/**
 * The app version the docs were read from: `package.json` next to the `docs/`
 * folder, or the same file at DOCS_REF. It is printed on every docs page so a
 * reader on an older release can tell the page may describe something newer.
 * Null rather than a failure when it cannot be read — it is a label, not a
 * contract.
 */
async function readAppVersion(dir) {
	try {
		const text = dir
			? readFileSync(join(dir, '..', 'package.json'), 'utf8')
			: await (await fetch(`${RAW.replace(/\/docs$/, '')}/package.json`)).text();
		const version = JSON.parse(text).version;
		return typeof version === 'string' ? version : null;
	} catch {
		return null;
	}
}

/** A doc in the folder that nobody linked: the app grew a page the site lost. */
function unclaimedDocs(dir) {
	if (!dir) return [];
	const claimed = new Set(DOCS_ORDER.map((item) => item.source));
	return readdirSync(dir)
		.filter((name) => name.endsWith('.md') && !claimed.has(name))
		.map((name) => `docs/${name}`);
}

// ------------------------------------------------------------- transforms

const HEADING = /^#{1,6}[ \t]+(.*?)[ \t]*$/;

/** GitHub's heading slugs, which is also what Astro generates for the ids. */
function slugify(text) {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\w\- ]+/g, '')
		.replace(/[ \t]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
}

/** Walk the lines, skipping fenced code — `# comment` is not a heading. */
function walkLines(text, visit) {
	let fence = null;
	text.split('\n').forEach((line, index) => {
		const match = /^\s*(```+|~~~+)/.exec(line);
		if (match) {
			if (fence === null) fence = match[1][0].repeat(3);
			else if (line.trimStart().startsWith(fence)) fence = null;
			return;
		}
		if (fence !== null) return;
		visit(line, index);
	});
}

/** Every heading in the finished page, for the link check and for extras. */
function headings(text) {
	const found = [];
	walkLines(text, (line) => {
		const match = HEADING.exec(line);
		if (match) found.push(match[1]);
	});
	return found;
}

/**
 * The app's own H1 becomes the nav title, so it must not render twice. A doc
 * without one is not a failure — the nav title is still the page's H1 — but it
 * is worth saying out loud, because the app's heading and the site's title would
 * then be two names for the same page.
 */
function stripTitle(text) {
	const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
	const lines = body.split('\n');
	const first = lines.findIndex((line) => line.trim() !== '');
	if (first !== -1 && HEADING.test(lines[first]) && lines[first].startsWith('# ')) {
		lines.splice(first, 1);
		return { body: lines.join('\n').replace(/^\s+/, ''), hadTitle: true };
	}
	return { body, hadTitle: false };
}

/** Put a block directly under a heading, addressed by its text. */
function insertAfterHeading(body, anchor, content, item) {
	const lines = body.split('\n');
	const matches = [];
	lines.forEach((line, index) => {
		const match = HEADING.exec(line);
		if (match && match[1].toLowerCase() === anchor.toLowerCase()) matches.push(index);
	});
	if (matches.length === 0) {
		throw new Error(
			`${item.slug}: extras anchor "${anchor}" is not a heading in ${item.source}. ` +
				`Headings there: ${headings(body).map((h) => `"${h}"`).join(', ')}`
		);
	}
	if (matches.length > 1) {
		throw new Error(`${item.slug}: extras anchor "${anchor}" matches more than one heading.`);
	}
	lines.splice(matches[0] + 1, 0, '', content, '');
	return lines.join('\n');
}

/** Splice in the site's own additions. See src/docs/extras/ for the syntax. */
function applyExtras(body, extras, item) {
	if (!extras) return body;

	const blocks = [];
	const rest = extras.replace(
		/<!--\s*docs:(after\s+"([^"]+)"|page)\s*-->([\s\S]*?)<!--\s*docs:end\s*-->/g,
		(_all, kind, anchor, content) => {
			blocks.push({ anchor: kind === 'page' ? null : anchor, content: content.trim() });
			return '\u0000';
		}
	);
	const tail = rest.split('\u0000').join('').trim();

	// Blocks are grouped by where they go, so two blocks aimed at the same
	// heading land in the order they are written rather than reversed.
	const atTop = blocks.filter((block) => block.anchor === null).map((block) => block.content);
	const byAnchor = new Map();
	for (const block of blocks) {
		if (block.anchor === null) continue;
		const key = block.anchor.toLowerCase();
		if (!byAnchor.has(key)) byAnchor.set(key, { anchor: block.anchor, parts: [] });
		byAnchor.get(key).parts.push(block.content);
	}

	let out = body.trim();
	if (atTop.length) out = `${atTop.join('\n\n')}\n\n${out}`;
	for (const { anchor, parts } of byAnchor.values()) {
		out = insertAfterHeading(out, anchor, parts.join('\n\n'), item);
	}
	if (tail) out = `${out.trimEnd()}\n\n${tail}`;
	return out;
}

/** `/docs/oauth-apps/` for a slug the nav knows, null for anything else. */
function docsHref(path) {
	const slug = path.replace(/^\.\//, '').replace(/\.md$/, '');
	return DOCS_ORDER.some((item) => item.slug === slug) ? `/docs/${slug}/` : null;
}

function rewriteLinks(body, item) {
	return body.replace(/\]\(([^)\s]+)([^)]*)\)/g, (all, target, rest) => {
		if (/^([a-z][a-z0-9+.-]*:|#|\/)/i.test(target)) return all;
		const hash = target.startsWith('#') ? '' : target.slice(target.indexOf('#') === -1 ? target.length : target.indexOf('#'));
		const path = hash ? target.slice(0, -hash.length) : target;

		if (path.startsWith('../')) {
			const repoPath = path.replace(/^(\.\.\/)+/, '');
			if (ASSET.test(repoPath)) {
				warnings.push(
					`${item.slug}: "${target}" is an image or clip that lives in the app repo. GitHub will ` +
						`render it; this site will not. Copy it to public/shots/ and reference it from ` +
						`src/docs/extras/${item.slug}.md instead.`
				);
			}
			return `](${BLOB}/${repoPath}${hash}${rest})`;
		}
		const href = docsHref(path);
		if (!href) {
			throw new Error(
				ASSET.test(path)
					? `${item.slug}: ${item.source} references "${target}", which is an image or clip the ` +
							`site does not have. Copy it to public/shots/ and reference it from ` +
							`src/docs/extras/${item.slug}.md.`
					: `${item.slug}: ${item.source} links to "${target}", which is not a page in src/docs/nav.mjs.`
			);
		}
		return `](${href}${hash}${rest})`;
	});
}

/** Warn when a link points at a heading the target page does not have. */
function checkAnchors(body, item, index) {
	body.replace(/\]\((\/docs\/[^)\s]+?\/)#([^)\s]+)\)/g, (all, href, anchor) => {
		const slug = href.replace('/docs/', '').replace(/\/$/, '');
		const known = index.get(slug);
		if (known && !known.has(anchor)) {
			warnings.push(`${item.slug} links to ${href}#${anchor}, and ${slug} has no such heading.`);
		}
		return all;
	});
}

/**
 * The rewriter only understands `](target)` with no spaces. Reference-style
 * definitions and targets with spaces slip past it and would resolve against the
 * site's own URL space, so say so rather than shipping a 404.
 */
function warnAboutLeftovers(body, item) {
	walkLines(body, (line) => {
		// `(?!\^)` keeps a footnote definition (`[^1]: text`) out of this.
		for (const match of line.matchAll(/\]\(([^)\s]+)|^\[(?!\^)[^\]]+\]:\s*(\S+)/g)) {
			const target = match[1] ?? match[2];
			if (!target || /^([a-z][a-z0-9+.-]*:|#|\/|\.\.\/)/i.test(target)) continue;
			warnings.push(
				`${item.slug}: "${target}" is a relative link the rewriter did not recognise, so it will ` +
					`not resolve on the site. Write it as a normal markdown link.`
			);
		}
	});
}

function frontmatter(item) {
	const lines = [
		'---',
		`title: ${JSON.stringify(item.title)}`,
		`description: ${JSON.stringify(item.description)}`,
		`group: ${JSON.stringify(item.group)}`,
		`order: ${DOCS_ORDER.indexOf(item)}`,
		`source: ${JSON.stringify(`docs/${item.source}`)}`,
		'---'
	];
	return `${lines.join('\n')}\n`;
}

// ------------------------------------------------------------------- run

const source = localSource();

for (const stray of unclaimedDocs(source)) {
	warnings.push(`${stray} is not in src/docs/nav.mjs, so the site has no page for it.`);
}

const pages = [];
for (const item of DOCS_ORDER) {
	const extrasFile = join(EXTRAS_DIR, `${item.slug}.md`);
	const extras = existsSync(extrasFile) ? readFileSync(extrasFile, 'utf8') : null;
	if (!extras) warnings.push(`src/docs/extras/${item.slug}.md is missing: the page is the app's text alone.`);
	const app = stripTitle(await readSource(source, item));
	if (!app.hadTitle) {
		warnings.push(
			`${item.source} has no H1, so the page is titled "${item.title}" from the nav alone.`
		);
	}
	const body = rewriteLinks(applyExtras(app.body, extras, item), item);
	warnAboutLeftovers(body, item);
	pages.push({ item, body });
}

// Anchors are validated against the finished page, extras included.
const index = new Map();
for (const { item, body } of pages) {
	index.set(item.slug, new Set(headings(body).map(slugify)));
}
for (const { item, body } of pages) {
	checkAnchors(body, item, index);
}

mkdirSync(OUT_DIR, { recursive: true });
const expected = new Set(DOCS_ORDER.map((item) => `${item.slug}.md`));

for (const { item, body } of pages) {
	const banner =
		`<!--\n  Generated by scripts/sync-docs.mjs from ${item.source} in github.com/${REPO}.\n` +
		`  Edits here are overwritten. Site-only additions live in src/docs/extras/${item.slug}.md.\n-->`;
	const output = `${frontmatter(item)}\n${banner}\n\n${body.trim()}\n`;
	const file = join(OUT_DIR, `${item.slug}.md`);
	const before = existsSync(file) ? readFileSync(file, 'utf8') : null;
	if (before === output) unchanged.push(item.slug);
	else {
		written.push(item.slug);
		if (!CHECK) writeFileSync(file, output);
	}
}

// Read by `src/docs/meta.ts`. JSON rather than frontmatter because the header
// and the footer show it on pages that are not docs at all.
const meta = `${JSON.stringify({ ref: REF, version: await readAppVersion(source) }, null, '\t')}\n`;
const metaFile = join(OUT_DIR, 'meta.json');
if (!CHECK && (!existsSync(metaFile) || readFileSync(metaFile, 'utf8') !== meta)) {
	writeFileSync(metaFile, meta);
}

for (const name of existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []) {
	if (name.endsWith('.md') && !expected.has(name)) {
		if (!CHECK) rmSync(join(OUT_DIR, name));
		warnings.push(`${name} was generated by an older nav and has been removed.`);
	}
}

const total = pages.length;
const drifted = written.length;
if (CHECK && drifted) {
	console.error(`Docs drift: ${drifted} of ${total} page(s) would be rewritten: ${written.join(', ')}`);
	process.exitCode = 1;
} else if (!CHECK) {
	console.log(
		`Docs: ${total} page(s) from ${source ? relative(root, source) : RAW} — ` +
			`${written.length} written, ${unchanged.length} unchanged.`
	);
}
for (const warning of warnings) console.warn(`  warning: ${warning}`);
