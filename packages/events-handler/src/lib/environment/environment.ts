import { z } from "zod";

const environmentSchema = z
  .object({
    ROOT_FOLDER_HOST: z.string(),
    NODE_ENV: z.string(),
    JWT_SECRET: z.string(),
  })
  .transform((env) => {
    const { ROOT_FOLDER_HOST, NODE_ENV, JWT_SECRET } = env;

    return {
      rootFolderHost: ROOT_FOLDER_HOST,
      nodeEnv: NODE_ENV,
      jwtSecret: JWT_SECRET,
    };
  });

export const getEnv = () => environmentSchema.parse(process.env);
