import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://trafficchallan.com',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
