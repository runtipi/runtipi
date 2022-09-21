import { getConfig } from '../core/config/TipiConfig';

export const APP_DATA_FOLDER = 'app-data';
export const APPS_FOLDER = 'apps';
export const isProd = getConfig().NODE_ENV === 'production';
