export const sanitizePath = (inputPath: string) => {
  // Remove any sequence of "../" or "./" to prevent directory traversal
  return inputPath.replace(/(\.\.\/|\.\/)/g, '');
};
