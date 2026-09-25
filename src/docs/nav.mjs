/**
 * The documentation navigation: one list, in the order a reader meets it.
 *
 * It is a plain `.mjs` file because two very different things read it: the
 * pages (sidebar, prev/next, the index cards) and `scripts/sync-docs.mjs`,
 * which needs to know which file in the app repo becomes which page here.
 * A `.ts` file would have been fine for the pages and unreadable to the script.
 *
 * `slug` is the URL: `/docs/<slug>/` and the name of the extras file that goes
 * with it. `source` is the file in the app repo's `docs/` folder — the app owns
 * the words, this file only owns where they sit and what the page is called.
 *
 * @typedef {{ slug: string; title: string; description: string; source?: string }} DocsItem
 * @typedef {{ group: string; items: DocsItem[] }} DocsGroup
 */

/** @type {DocsGroup[]} */
export const DOCS_NAV = [
	{
		group: 'Get started',
		items: [
			{
				slug: 'deploy',
				title: 'Install and deploy',
				description:
					'One command that creates the database, the bucket, the secrets and the account, then deploys the Worker — and how to update or roll back afterwards.'
			},
			{
				slug: 'configuration',
				title: 'Configuration',
				description:
					'The secrets your instance reads, how to name it, how to keep your deployment separate from upstream, and how to get back in when the login is lost.'
			}
		]
	},
	{
		group: 'Use it',
		items: [
			{
				slug: 'composer',
				title: 'Writing and publishing',
				description:
					'Threads, per-platform overrides, images and alt text, and the difference between publishing now and scheduling.'
			},
			{
				slug: 'posts',
				title: 'Posts and Insights',
				description:
					'What every post can do from the list, how retries work, and the delivery stats that say what broke.'
			},
			{
				slug: 'accounts',
				title: 'Connecting accounts',
				description:
					'Connecting Mastodon, Bluesky, LinkedIn, Threads and X, reconnecting when a token expires, and what disconnecting keeps.'
			}
		]
	},
	{
		group: 'Connect and secure',
		items: [
			{
				slug: 'oauth-apps',
				title: 'OAuth apps',
				description:
					'Register the developer apps LinkedIn, Threads and X require, then check each platform’s limits on text, images and threads.'
			},
			{
				slug: 'zernio',
				title: 'Connect through Zernio',
				description:
					'Connect X, Threads, LinkedIn and Bluesky through Zernio’s approved apps instead of registering your own, and what differs.'
			},
			{
				slug: 'access',
				title: 'Cloudflare Access',
				description:
					'Put an identity check in front of the whole instance, so even the login page is behind your own provider.'
			},
			{
				slug: 'domains',
				title: 'Domains and URLs',
				description:
					'Rename the workers.dev URL, move to a custom domain, and the three things to update when the hostname changes.'
			}
		]
	},
	{
		group: 'Publish and automate',
		items: [
			{
				slug: 'scheduling',
				title: 'Scheduling',
				description:
					'The built-in cron trigger, an external pinger when the free-plan trigger limit is in the way, the cadence, and failure emails.'
			},
			{
				slug: 'api',
				title: 'API keys',
				description:
					'Use a personal key from scripts, Shortcuts and cron jobs. The full endpoint reference lives in your own instance, at /api.'
			}
		]
	},
	{
		group: 'Keep it running',
		items: [
			{
				slug: 'backups',
				title: 'Backups',
				description:
					'What D1 keeps for you, how to export your own copy, and how to copy the media bucket.'
			},
			{
				slug: 'troubleshooting',
				title: 'Troubleshooting',
				description:
					'The errors people actually hit — a taken bucket name, the cron-trigger limit, a 503, silent scheduling — and what fixes each.'
			}
		]
	},
	{
		group: 'Contribute',
		items: [
			{
				slug: 'development',
				title: 'Local development',
				description:
					'Run the app on your machine, and the checks a change has to pass before it is done.'
			}
		]
	}
];

/**
 * The same list, flattened and numbered — what prev/next and the sync script
 * walk. `group` rides along so a page can print where it sits without looking
 * its own group up again.
 */
export const DOCS_ORDER = DOCS_NAV.flatMap((group) =>
	group.items.map((item) => ({ ...item, group: group.group, source: item.source ?? `${item.slug}.md` }))
);

/** The page before and after a slug, for the footer links. */
export function docsNeighbours(slug) {
	const index = DOCS_ORDER.findIndex((item) => item.slug === slug);
	if (index === -1) return { prev: null, next: null };
	return {
		prev: index > 0 ? DOCS_ORDER[index - 1] : null,
		next: index < DOCS_ORDER.length - 1 ? DOCS_ORDER[index + 1] : null
	};
}
