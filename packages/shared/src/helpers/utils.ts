export const pLimit = (concurrency: number) => {
  const queue: (() => Promise<void>)[] = [];
  let activeCount = 0;

  const next = () => {
    if (queue.length > 0 && activeCount < concurrency) {
      activeCount++;
      const fn = queue.shift();
      fn?.().finally(() => {
        activeCount--;
        next();
      });
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> =>
    new Promise((resolve, reject) => {
      const run = () =>
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => next());

      queue.push(run);
      next();
    });
};
