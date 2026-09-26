import { LINKS } from './config';

const API_URL = LINKS.repo.replace('https://github.com/', 'https://api.github.com/repos/');

/**
 * Read once per build and baked into the page, so visitors never call GitHub
 * and the CSP stays as it is. The count is as fresh as the last deploy. A
 * failed or slow request yields null and the header drops the number rather
 * than failing the build.
 */
let starsRequest: Promise<number | null> | undefined;

export function githubStars(): Promise<number | null> {
	starsRequest ??= fetch(API_URL, {
		headers: { Accept: 'application/vnd.github+json' },
		signal: AbortSignal.timeout(5000)
	})
		.then(async (res) => {
			if (!res.ok) return null;
			const { stargazers_count } = (await res.json()) as { stargazers_count?: unknown };
			return typeof stargazers_count === 'number' ? stargazers_count : null;
		})
		.catch(() => null);
	return starsRequest;
}

export function formatStars(count: number): string {
	if (count < 1000) return String(count);
	const k = count / 1000;
	return `${k >= 10 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, '')}k`;
}
