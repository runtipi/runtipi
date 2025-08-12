import { setTimeout as wait } from 'node:timers/promises';

export function Cooldown(ms: number) {
  const lastCallMap: Map<string, number> = new Map();

  return (_: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = async function (...args: unknown[]) {
      const now = Date.now();

      const lastCall = lastCallMap.get(propertyKey) || 0;
      const timeSinceLast = now - lastCall;

      if (timeSinceLast < ms) {
        const waitTime = ms - timeSinceLast;
        await wait(waitTime);
      }

      lastCallMap.set(propertyKey, Date.now());

      return original.apply(this, args);
    };
  };
}
