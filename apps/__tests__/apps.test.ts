import fs from "fs";
import jsyaml from "js-yaml";

interface AppConfig {
  id: string;
  port: number;
  categories: string[];
  requirements?: {
    ports?: number[];
  };
  name: string;
  description: string;
  version: string;
  image: string;
  short_desc: string;
  author: string;
  source: string;
  available: boolean;
}

const networkExceptions = ["pihole", "tailscale", "homeassistant", "plex"];
const getAppConfigs = (): AppConfig[] => {
  const apps: AppConfig[] = [];

  const appsDir = fs.readdirSync("./apps");

  appsDir.forEach((app) => {
    const path = `./apps/${app}/config.json`;

    if (fs.existsSync(path)) {
      const configFile = fs.readFileSync(path).toString();

      try {
        const config: AppConfig = JSON.parse(configFile);
        if (config.available) {
          apps.push(config);
        }
      } catch (e) {
        console.error("Error parsing config file", app);
      }
    }
  });

  return apps;
};

describe("App configs", () => {
  it("Get app config should return at least one app", () => {
    const apps = getAppConfigs();

    expect(apps.length).toBeGreaterThan(0);
  });

  it("Each app should have an id", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      expect(app.id).toBeDefined();
    });
  });

  it("Each app should have a md description", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      const path = `./apps/${app.id}/metadata/description.md`;

      if (fs.existsSync(path)) {
        const description = fs.readFileSync(path).toString();
        expect(description).toBeDefined();
      } else {
        console.error(`Missing description for app ${app.id}`);
        expect(true).toBe(false);
      }
    });
  });

  it("Each app should have categories defined as an array", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      expect(app.categories).toBeDefined();
      expect(app.categories).toBeInstanceOf(Array);
    });
  });

  it("Each app should have a name", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      expect(app.name).toBeDefined();
    });
  });

  it("Each app should have a description", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      expect(app.description).toBeDefined();
    });
  });

  it("Each app should have a port", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      expect(app.port).toBeDefined();
      expect(app.port).toBeGreaterThan(999);
      expect(app.port).toBeLessThan(65535);
    });
  });

  it("Each app should have a different port", () => {
    const appConfigs = getAppConfigs();
    const ports = appConfigs.map((app) => app.port);
    expect(new Set(ports).size).toBe(appConfigs.length);
  });

  it("Each app should have a unique id", () => {
    const appConfigs = getAppConfigs();
    const ids = appConfigs.map((app) => app.id);
    expect(new Set(ids).size).toBe(appConfigs.length);
  });

  it("Each app should have a docker-compose file beside it", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      expect(fs.existsSync(`./apps/${app.id}/docker-compose.yml`)).toBe(true);
    });
  });

  it("Each app should have a container name equals to its id", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      const dockerComposeFile = fs
        .readFileSync(`./apps/${app.id}/docker-compose.yml`)
        .toString();

      const dockerCompose: any = jsyaml.load(dockerComposeFile);

      if (!dockerCompose.services[app.id]) {
        console.error(app.id);
      }

      expect(dockerCompose.services[app.id]).toBeDefined();
      expect(dockerCompose.services[app.id].container_name).toBe(app.id);
    });
  });

  it("Each app should have network tipi_main_network", () => {
    const apps = getAppConfigs();

    apps.forEach((app) => {
      if (!networkExceptions.includes(app.id)) {
        const dockerComposeFile = fs
          .readFileSync(`./apps/${app.id}/docker-compose.yml`)
          .toString();

        const dockerCompose: any = jsyaml.load(dockerComposeFile);

        expect(dockerCompose.services[app.id]).toBeDefined();

        if (!dockerCompose.services[app.id].networks) {
          console.error(app.id);
        }

        expect(dockerCompose.services[app.id].networks).toBeDefined();
        expect(dockerCompose.services[app.id].networks).toStrictEqual([
          "tipi_main_network",
        ]);
      }
    });
  });
});
