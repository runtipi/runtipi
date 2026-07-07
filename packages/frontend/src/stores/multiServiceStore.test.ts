import { convertLegacyToYaml } from '@runtipi/common/schemas';
import { parse, stringify } from 'yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMultiServiceStore } from './multiServiceStore';

vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('multiServiceStore', () => {
  beforeEach(() => {
    useMultiServiceStore.getState().resetToDefaults();
  });

  it('preserves root-level volumes when YAML is saved and rebuilt from store state', () => {
    useMultiServiceStore.getState().updateFromYaml(
      parse(`x-runtipi:
  schema_version: 2
services:
  dockhand:
    image: fnsys/dockhand:latest
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - dockhand_data:/app/data
    x-runtipi:
      internal_port: "3000"
      is_main: true
volumes:
  dockhand_data:
`),
    );

    const { services, composeExtras } = useMultiServiceStore.getState();
    const rebuiltYaml = {
      ...convertLegacyToYaml({
        schemaVersion: 2,
        services: services.map(({ _id, ...service }) => service),
      }),
      ...composeExtras,
    };

    expect(rebuiltYaml).toMatchObject({
      services: {
        dockhand: {
          image: 'fnsys/dockhand:latest',
        },
      },
      volumes: {
        dockhand_data: null,
      },
    });
    expect(stringify(rebuiltYaml, { nullStr: '' })).toContain(`volumes:
  dockhand_data:
`);
  });
});
