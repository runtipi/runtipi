export const APP_DIR = '/app';
export const DATA_DIR = '/data';
export const APP_DATA_DIR = '/app-data';

export const APP_REL_COMPOSE_FILENAME = 'docker-compose.yml';
export const APP_GENERATED_COMPOSE_FILENAME = 'docker-compose.generated.yml';

export const SESSION_COOKIE_NAME = 'runtipi-sid';
export const FORWARD_AUTH_COOKIE_NAME = 'runtipi-forward-auth';
export const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24;

export const ARCHITECTURES = ['arm64', 'amd64'] as const;
export type Architecture = (typeof ARCHITECTURES)[number];
