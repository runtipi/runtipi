import { z } from 'zod';
import dotenv from 'dotenv';

if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: '.env.dev', override: true });
} else {
  dotenv.config({ override: true });
}

const environmentSchema = z
  .object({
    RUNTIPI_APP_DATA_PATH: z.string(),
    ROOT_FOLDER_HOST: z.string(),
    APPS_REPO_ID: z.string(),
    ARCHITECTURE: z.enum(['arm64', 'amd64']),
    INTERNAL_IP: z.string().ip().or(z.literal('localhost')),
    TIPI_VERSION: z.string(),
    REDIS_PASSWORD: z.string(),
    REDIS_HOST: z.string(),
    POSTGRES_PORT: z.string(),
    POSTGRES_USERNAME: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DBNAME: z.string(),
    POSTGRES_HOST: z.string(),
    JWT_SECRET: z.string(),
    EVENTS_TIMEOUT: z.string(),
    REPEAT_TIMEOUT: z.string(),
  })
  .transform((env) => {
    const {
      RUNTIPI_APP_DATA_PATH,
      ARCHITECTURE,
      ROOT_FOLDER_HOST,
      APPS_REPO_ID,
      INTERNAL_IP,
      TIPI_VERSION,
      REDIS_PASSWORD,
      REDIS_HOST,
      POSTGRES_DBNAME,
      POSTGRES_PASSWORD,
      POSTGRES_USERNAME,
      POSTGRES_PORT,
      POSTGRES_HOST,
      JWT_SECRET,
      EVENTS_TIMEOUT,
      REPEAT_TIMEOUT,
      ...rest
    } = env;

    return {
      appDataPath: RUNTIPI_APP_DATA_PATH,
      rootFolderHost: ROOT_FOLDER_HOST,
      appsRepoId: APPS_REPO_ID,
      arch: ARCHITECTURE,
      tipiVersion: TIPI_VERSION,
      internalIp: INTERNAL_IP,
      redisPassword: REDIS_PASSWORD,
      redisHost: REDIS_HOST,
      postgresPort: POSTGRES_PORT,
      postgresUsername: POSTGRES_USERNAME,
      postgresPassword: POSTGRES_PASSWORD,
      postgresDatabase: POSTGRES_DBNAME,
      postgresHost: POSTGRES_HOST,
      jwtSecret: JWT_SECRET,
      eventsTimeout: EVENTS_TIMEOUT,
      repeatTimeout: REPEAT_TIMEOUT,
      ...rest,
    };
  });

export const getEnv = () => environmentSchema.parse(process.env);
