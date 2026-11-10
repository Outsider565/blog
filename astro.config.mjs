import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { siteConfig } from './scripts/site-config.mjs';

const { site, base } = siteConfig();

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  integrations: [mdx()],
});
