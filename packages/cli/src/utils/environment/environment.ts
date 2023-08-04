import { z } from 'zod';
import dotenv from 'dotenv';

if (process.env.NODE_ENV === 'development') {
  dotenv.config({ path: '.env.dev' });
} else {
  dotenv.config();
}

const environmentSchema = z
  .object({
    PWD: z.string(),
    STORAGE_PATH: z.string(),
    ROOT_FOLDER_HOST: z.string(),
    APPS_REPO_ID: z.string(),
    ARCHITECTURE: z.enum(['arm64', 'amd64']),
    INTERNAL_IP: z.string().ip().or(z.literal('localhost')),
  })
  .transform((env) => {
    const { PWD, STORAGE_PATH, ARCHITECTURE, ROOT_FOLDER_HOST, APPS_REPO_ID, INTERNAL_IP, ...rest } = env;

    return {
      pwd: PWD,
      storagePath: STORAGE_PATH,
      rootFolderHost: ROOT_FOLDER_HOST,
      appsRepoId: APPS_REPO_ID,
      arch: ARCHITECTURE,
      internalIp: INTERNAL_IP,
      ...rest,
    };
  });

export type Environment = z.infer<typeof environmentSchema>;

export const getEnv = () => environmentSchema.parse(process.env);
