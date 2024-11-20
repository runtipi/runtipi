export const APP_DIR = '/app';
export const DATA_DIR = '/data';
export const APP_DATA_DIR = '/app-data';

export const SESSION_COOKIE_NAME = 'tipi.sid';
export const SESSION_COOKIE_MAX_AGE = 1000 * 60 * 60 * 24;

export const ARCHITECTURES = ['arm64', 'amd64'] as const;
export type Architecture = (typeof ARCHITECTURES)[number];

export const LATEST_RELEASE_URL = 'https://api.github.com/repos/runtipi/runtipi/releases/latest';
