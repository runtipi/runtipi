/**
 * Returns the user id and group id of the current user
 */
export const getUserIds = () => {
  if (process.getgid && process.getuid) {
    const isSudo = process.getgid() === 0 && process.getuid() === 0;

    return { uid: process.getuid(), gid: process.getgid(), isSudo };
  }

  return { uid: 1000, gid: 1000, isSudo: false };
};
