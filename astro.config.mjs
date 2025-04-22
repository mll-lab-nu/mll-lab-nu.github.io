import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // ...
  integrations: [react(), tailwind()],
  output: "static",
  site: "https://mll-lab-nu.github.io",
  base: "/",
  redirects: {
    '/releases/[...path]': 'https://crowdie.stanford.edu/[...path]'
  }
});