/**
 * Convert a string of environment variables to a Map
 *
 * @param {string} envString - String of environment variables
 */
export const envStringToMap = (envString: string) => {
  const envMap = new Map<string, string>();
  const envArray = envString.split('\n');

  for (const env of envArray) {
    if (env.startsWith('#')) continue;

    const [key, ...rest] = env.split('=');

    if (key && rest.length) envMap.set(key, rest.join('='));
  }

  return envMap;
};

/**
 * Convert a Map of environment variables to a valid string of environment variables
 * that can be used in a .env file
 *
 * @param {Map<string, string>} envMap - Map of environment variables
 */
export const envMapToString = (envMap: Map<string, string>) => {
  const envArray = Array.from(envMap).map(([key, value]) => `${key}=${value}`);
  return envArray.join('\n');
};
