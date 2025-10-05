export function deepClean<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(deepClean).filter((v) => v !== undefined && v !== null) as T;
  }

  if (obj && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const cleaned = deepClean(value);
      if (cleaned !== undefined) acc[key as keyof T] = cleaned;
      return acc;
    }, {} as T);
  }
  return obj;
}
