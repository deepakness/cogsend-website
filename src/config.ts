/**
 * One place for every outbound link and the handful of values that appear in
 * more than one component. When the docs move onto this site, `/docs` below is
 * the only line that has to change.
 */
export const SITE = {
	url: 'https://cogsend.com',
	name: 'CogSend',
	/** Kept near 60 characters so it is not truncated in a result snippet. */
	title: 'Self-hosted social media scheduler — CogSend',
	/** Held under ~155 characters, which is about where Google truncates. */
	description:
		'Self-hosted social scheduler for Mastodon, Bluesky, LinkedIn, Threads and X. Write once, customize per platform, schedule on your own Cloudflare account.'
} as const;

export const LINKS = {
	repo: 'https://github.com/deepakness/cogsend',
	releases: 'https://github.com/deepakness/cogsend/releases',
	issues: 'https://github.com/deepakness/cogsend/issues',
	security: 'https://github.com/deepakness/cogsend/blob/main/SECURITY.md',
	license: 'https://github.com/deepakness/cogsend/blob/main/LICENSE',
	siteRepo: 'https://github.com/deepakness/cogsend-website',
	// The docs are written in the app repo and rendered here by
	// `scripts/sync-docs.mjs`, which is why these are paths on this site rather
	// than links into GitHub. The app repo's `docs/` folder is still the place
	// the text is edited.
	docs: '/docs/',
	deploy: '/docs/deploy/',
	configuration: '/docs/configuration/',
	composer: '/docs/composer/',
	oauth: '/docs/oauth-apps/',
	scheduling: '/docs/scheduling/',
	api: '/docs/api/',
	author: 'https://deepakness.com',
	// Cloudflare's own free-plan numbers, linked rather than restated so this
	// site never becomes the stale copy of a page Cloudflare maintains.
	cfWorkersLimits: 'https://developers.cloudflare.com/workers/platform/limits/',
	cfD1Pricing: 'https://developers.cloudflare.com/d1/platform/pricing/',
	cfR2Pricing: 'https://developers.cloudflare.com/r2/pricing/'
} as const;

/**
 * The narrated product demo, served from the project's own asset bucket rather
 * than bundled into the build. It is 67 MB and two minutes long, so the hero
 * links to it and the dialog fetches it on click — never on page load. The
 * dimensions are here so the player can reserve its box, which stops the
 * dialog resizing when the metadata arrives.
 */
export const DEMO_VIDEO = {
	url: 'https://assets.deepakness.com/cogsend/cogsend-demo-2k.mp4',
	width: 1712,
	height: 1080
} as const;

/**
 * The project's X handle, with the leading `@`, used for the `twitter:site`
 * meta tag. Left empty rather than guessed: a wrong handle is worse than none.
 */
export const X_HANDLE = '';

/** Rendered size of `public/og.png`, drawn by `scripts/make-og.mjs`. */
export const OG_IMAGE = {
	path: '/og.png',
	width: 1200,
	height: 630,
	alt: 'CogSend — your social scheduler, on your own Cloudflare account.'
} as const;

/**
 * The app's README prints the install as two lines:
 *
 *     git clone --depth 1 https://github.com/deepakness/cogsend.git cogsend
 *     cd cogsend && npm install && npm run setup
 *
 * Joined with `&&` it is one paste that actually installs, which is what the
 * hero and the closing call to action copy. Keep it identical to the app's
 * README — this is the one string on the site that has to be exact.
 */
export const INSTALL_COMMAND =
	'git clone --depth 1 https://github.com/deepakness/cogsend.git cogsend && cd cogsend && npm install && npm run setup';

/**
 * Cloudflare Web Analytics. Empty until the site has its own Web Analytics
 * entry, which is why the beacon is not rendered locally: a tokenless beacon
 * is a request to a third party that reports nothing.
 */
export const CF_ANALYTICS_TOKEN = '';

/**
 * Umami analytics, self-hosted on umami.vempus.com. The website id is public —
 * it ships in the source of every page — so it sits here with the other
 * constants rather than in an environment file. `Layout.astro` renders the tag
 * on every page, and `public/_headers` allows the origin in `script-src` and in
 * `connect-src`, because the tracker posts back to the host that served it.
 *
 * `domains` is an exact hostname match inside the tracker. That is what keeps
 * localhost — `npm run dev`, `npm run preview` and the CI accessibility run —
 * out of the numbers. Add a hostname here if the site ever gets a second one.
 */
export const UMAMI = {
	script: 'https://umami.vempus.com/script.js',
	websiteId: '83390cb5-6000-4ce0-80b3-a10c96318551',
	domains: 'cogsend.com'
} as const;
