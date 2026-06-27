import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/core/database/drizzle/schema.ts',
  out: './src/core/database/drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
