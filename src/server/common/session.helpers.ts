import { v4 } from 'uuid';

export const generateSessionId = (prefix: string) => {
  return `${prefix}-${v4()}`;
};
