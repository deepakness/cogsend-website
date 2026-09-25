import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Fully static output. The build lands in ./dist, which is what the
// `assets.directory` in wrangler.jsonc points at — no Astro adapter needed
// until a route actually renders on a server.
export default defineConfig({
	site: 'https://cogsend.com',
	trailingSlash: 'ignore',
	build: { format: 'directory' },
	integrations: [sitemap()],
	markdown: {
		// Dark code blocks, like the terminal styling the rest of the site uses.
		// `wrap` keeps a long command readable on a phone instead of turning the
		// block into a sideways-scrolling region.
		shikiConfig: { theme: 'github-dark', wrap: true }
	},
	vite: { plugins: [tailwindcss()] },
	// The floating dev toolbar sits over the bottom of the viewport, which is
	// exactly where screenshots for review get taken from. Turn it on locally
	// when you want it.
	devToolbar: { enabled: false }
});
