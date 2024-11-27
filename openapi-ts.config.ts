import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: './packages/backend/src/swagger.json',
  output: {
    path: './packages/frontend/src/api-client',
    format: 'biome',
  },
  plugins: ['@tanstack/react-query'],
});
