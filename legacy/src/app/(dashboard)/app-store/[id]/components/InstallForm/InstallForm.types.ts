export type FormValues = {
  exposed: boolean;
  exposedLocal: boolean;
  openPort: boolean;
  domain?: string;
  isVisibleOnGuestDashboard?: boolean;
  [key: string]: string | boolean | undefined;
};
