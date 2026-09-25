/**
 * Audits the built site with axe-core.
 *
 *     npm run build
 *     npm run preview          # in another shell, serving dist
 *     npm run check:a11y       # or: node scripts/check-a11y.mjs http://localhost:4321
 *
 * Static output has no server-side safety net, so this is the check that the
 * contrast, heading order and labelling hold on every page Astro emits. It
 * crawls the links it finds rather than a hardcoded list, so a new page is
 * covered the moment it is linked.
 *
 * Two things it has to do before it trusts an axe result:
 *
 *  1. Scroll the page first. Blocks using `data-reveal` start at `opacity: 0`,
 *     and axe skips what it cannot see — auditing an unscrolled page silently
 *     misses most of it.
 *  2. Not care what status the 404 page answers with. It is seeded by hand
 *     because nothing links to it, and whether that path returns 200 or 404
 *     depends on what is in front of `dist` (Astro's preview says 200,
 *     `astro dev` says 404). Its markup is still worth auditing.
 *
 *  3. Abort the analytics hosts. The audit is about this site's markup, so it
 *     should not wait on a third party — `networkidle` would — nor hand CI
 *     traffic to one. Umami is scoped to cogsend.com in any case, so nothing
 *     it would send from localhost counts.
 */
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const axeSource = readFileSync(
	resolve(here, '../node_modules/axe-core/axe.min.js'),
	'utf8'
).toString();

const origin = (process.argv[2] ?? 'http://localhost:4321').replace(/\/$/, '');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// The analytics origins, off. Keep this in step with public/_headers.
await page.route(/umami\.vempus\.com|cloudflareinsights\.com/, (route) => route.abort());

const seen = new Set();
const queue = ['/', '/404.html'];
const findings = [];
// Whether the origin sends the CSP from public/_headers. `astro preview` does
// not, so the audit normally runs without it — worth saying out loud, because a
// page that only breaks under the real policy (Pagefind's WebAssembly did)
// cannot be caught here.
let csp = null;

while (queue.length) {
	const path = queue.shift();
	if (seen.has(path)) continue;
	seen.add(path);

	const expected404 = path === '/404.html';
	const response = await page.goto(origin + path, { waitUntil: 'networkidle' });
	if (csp === null && response) csp = response.headers()['content-security-policy'] ?? '';
	if (!response || (!expected404 && response.status() >= 400)) {
		findings.push({
			path,
			id: 'http-status',
			impact: 'serious',
			help: `HTTP ${response?.status()}`
		});
		continue;
	}

	await page.evaluate(async () => {
		for (let y = 0; y < document.body.scrollHeight; y += 400) {
			window.scrollTo(0, y);
			await new Promise((r) => setTimeout(r, 40));
		}
		window.scrollTo(0, 0);
	});
	await page.evaluate(() => {
		for (const el of document.querySelectorAll('[data-reveal]')) el.classList.add('is-visible');
	});

	// Pin everything to its final look. Forcing `is-visible` starts a 550ms
	// transition, and measuring contrast mid-flight reports half-faded text as a
	// violation that no settled page actually has.
	await page.addStyleTag({
		content:
			'*, *::before, *::after { transition: none !important; animation: none !important; }'
	});
	await page.waitForTimeout(100);

	await page.addScriptTag({ content: axeSource });
	const result = await page.evaluate(async () => {
		// @ts-expect-error injected by axe-core
		return await window.axe.run(document, {
			runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }
		});
	});

	for (const violation of result.violations) {
		findings.push({
			path,
			id: violation.id,
			impact: violation.impact,
			help: violation.help,
			nodes: violation.nodes
				.map((n) => `${n.target.join(' ')} :: ${(n.html || '').slice(0, 110)}`)
				.slice(0, 6)
		});
	}

	for (const link of await page.$$eval('a[href]', (anchors) =>
		anchors.map((a) => a.getAttribute('href'))
	)) {
		if (!link || !link.startsWith('/') || link.startsWith('//')) continue;
		const clean = link.split('#')[0] || '/';
		if (!seen.has(clean)) queue.push(clean);
	}
}

await browser.close();

const headerNote = csp
	? ''
	: '\n  note: no Content-Security-Policy on this origin (astro preview does not read public/_headers),\n' +
		'  so this audit ran without it. Test header-sensitive changes against the deployed headers.';

if (!findings.length) {
	console.log(`No WCAG 2.1 A/AA violations across ${seen.size} page(s).${headerNote}`);
	process.exit(0);
}

console.error(`${findings.length} finding(s) across ${seen.size} page(s):\n${headerNote}\n`);
for (const f of findings) {
	console.error(`  ${f.path}  [${f.impact}] ${f.id}: ${f.help}`);
	if (f.nodes) for (const node of f.nodes) console.error(`      ${node}`);
}
process.exit(1);
