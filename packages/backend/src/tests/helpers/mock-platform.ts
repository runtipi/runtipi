import { afterEach, beforeEach } from 'vitest';

export const mockPlatform = (platform: NodeJS.Platform) => {
  let originalPlatform: NodeJS.Platform;

  beforeEach(() => {
    originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: platform });
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });
};
