import { expect, test, vi } from 'vitest';
import { parse } from 'yaml';
import { FORWARD_AUTH_COOKIE_NAME } from '@/common/constants';

test.each(['docker-compose.dev.yml', 'docker-compose.prod.yml'])('%s forwards renewed app cookies from successful auth checks', async (file) => {
  const fs = await vi.importActual<typeof import('node:fs')>('node:fs');
  const compose = parse(fs.readFileSync(new URL(`../../../../../../${file}`, import.meta.url), 'utf8'));
  const labels = compose.services.runtipi.labels;

  expect(labels['traefik.http.middlewares.runtipi.forwardauth.addAuthCookiesToResponse']).toBe(FORWARD_AUTH_COOKIE_NAME);
});
