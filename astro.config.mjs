import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // The feed, link previews and canonical links are built from this.
  site: 'https://onnwee.me',
  server: { port: 4321 },
  devToolbar: { enabled: false },
  integrations: [sitemap()],
  // The stylesheet is small; putting it in the page saves a request before anything can be drawn.
  build: { inlineStylesheets: 'always' },
  // Posts used to live under /notes/.
  redirects: { '/notes/[id]': '/blog/[id]' },
  // Code blocks sit in terminal windows that set their own colors.
  markdown: { syntaxHighlight: false },
});
