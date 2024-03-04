import * as Sentry from '@sentry/nextjs';
import { TipiConfig } from '@/server/core/TipiConfig';
import * as jwt from 'jsonwebtoken';
import { systemLoadSchema } from '@runtipi/shared';

export async function fetchSystemStatus() {
  try {
    const { jwtSecret } = TipiConfig.getConfig();
    const token = jwt.sign({ skill: 'issue' }, jwtSecret);
    const response = await fetch('http://127.0.0.1/worker-api/system-status', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const { data } = (await response.json()) as { data: unknown };
    return systemLoadSchema.parse(data);
  } catch (error) {
    Sentry.captureException(error);
    return systemLoadSchema.parse({});
  }
}
