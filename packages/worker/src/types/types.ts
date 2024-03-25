export interface composeData {
  services: {
    [containerName: string]: {
      image: string;
    };
  };
}
