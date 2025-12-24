import { describe, expect, it } from 'vitest';
import { parseComposeJson } from '../utils/convert-legacy-schema.js';

describe('parseComposeJson', () => {
  describe('V1 schema with overrides', () => {
    it('should correctly parse V1 schema with architecture overrides', () => {
      const composeJson = {
        services: [
          {
            name: 'app',
            image: 'app:latest',
            isMain: true,
            internalPort: 80,
          },
        ],
        overrides: [
          {
            architecture: 'arm64',
            services: [
              {
                name: 'app',
                image: 'app:arm64-latest',
              },
            ],
          },
        ],
      };

      const result = parseComposeJson(composeJson);

      expect(result.overrides).toBeDefined();
      expect(result.overrides).toHaveLength(1);
      expect(result.overrides?.[0]?.architecture).toBe('arm64');
      expect(result.overrides?.[0]?.services).toHaveLength(1);
      expect(result.overrides?.[0]?.services?.[0]?.image).toBe('app:arm64-latest');
      expect(result.overrides?.[0]?.services?.[0]?.name).toBe('app');
    });

    it('should correctly parse V1 schema with multiple architecture overrides', () => {
      const composeJson = {
        services: [
          {
            name: 'app',
            image: 'app:latest',
            isMain: true,
            internalPort: 80,
          },
        ],
        overrides: [
          {
            architecture: 'arm64',
            services: [
              {
                name: 'app',
                image: 'app:arm64-latest',
              },
            ],
          },
          {
            architecture: 'amd64',
            services: [
              {
                name: 'app',
                image: 'app:amd64-latest',
              },
            ],
          },
        ],
      };

      const result = parseComposeJson(composeJson);

      expect(result.overrides).toBeDefined();
      expect(result.overrides).toHaveLength(2);
      expect(result.overrides?.[0]?.architecture).toBe('arm64');
      expect(result.overrides?.[1]?.architecture).toBe('amd64');
    });

    it('should correctly parse V2 schema with architecture overrides', () => {
      const composeJson = {
        schemaVersion: 2,
        services: [
          {
            name: 'app',
            image: 'app:latest',
            isMain: true,
            internalPort: 80,
          },
        ],
        overrides: [
          {
            architecture: 'arm64',
            services: [
              {
                name: 'app',
                image: 'app:arm64-latest',
              },
            ],
          },
        ],
      };

      const result = parseComposeJson(composeJson);

      expect(result.overrides).toBeDefined();
      expect(result.overrides).toHaveLength(1);
      expect(result.overrides?.[0]?.architecture).toBe('arm64');
      expect(result.overrides?.[0]?.services?.[0]?.image).toBe('app:arm64-latest');
    });
  });
});
