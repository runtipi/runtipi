export const APP_DIR = process.env.DASHBOARD_APP_DIR || '/dashboard';
export const DATA_DIR = '/data';
export const APP_DATA_DIR = '/app-data';

export const COMMANDS = {
  stop: './runtipi-cli stop',
  restart: './runtipi-cli stop',
  reboot: 'reboot',
  shutdown: 'shutdown -h now',
};
