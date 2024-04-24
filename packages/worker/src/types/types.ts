export interface ComposeData {
  services: {
    [containerName: string]: {
      image: string;
    };
  };
}
