import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel/serverless';

export default defineConfig({
  site: 'https://averde.ai',
  output: 'hybrid',
  adapter: vercel(),
  integrations: [tailwind(), react(), markdoc(), keystatic()],
});
