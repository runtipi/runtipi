import { defaultPlugins, defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './packages/backend/src/swagger.json',
  output: {
    path: './packages/frontend/src/api-client',
    format: 'biome',
  },
  plugins: [...defaultPlugins, '@tanstack/react-query', '@hey-api/client-fetch'],
});
