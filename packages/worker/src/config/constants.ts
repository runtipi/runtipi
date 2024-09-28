export const APP_DIR = process.env.WORKER_APP_DIR || '/worker';
export const DATA_DIR = '/data';
export const APP_DATA_DIR = '/app-data';

export const COMMANDS = {
    stop: './runtipi-cli stop',
    restart: './runtipi-cli stop',
    reboot: 'reboot',
    shutdown: 'shutdown -h now',
}