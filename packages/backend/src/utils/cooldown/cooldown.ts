import { setTimeout as wait } from 'node:timers/promises';

export function Cooldown(ms: number) {
  let lastCall = 0;
  let queue = Promise.resolve();
  return (_: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const gate = queue.then(async () => {
        const now = Date.now();
        const elapsed = now - lastCall;
        const waitMs = ms - elapsed;
        if (waitMs > 0) {
          await wait(waitMs);
        }
        lastCall = Date.now();
      });

      queue = gate.catch(() => {
        // noop
      });
      await gate;
      return original.apply(this, args);
    };
  };
}
