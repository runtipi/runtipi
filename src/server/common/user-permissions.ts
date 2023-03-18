export const USER_PERMISSIONS = {
  ADMINISTRATE_APPS: 'Can install, uninstall, start, stop and configure apps',
  ADMINISTRATE_SYSTEM: 'Can restart and update the system',
} as const;

export type UserPermission = keyof typeof USER_PERMISSIONS;
