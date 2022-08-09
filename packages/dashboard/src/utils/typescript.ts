const objectKeys = <T>(obj: T): (keyof T)[] => Object.keys(obj) as (keyof T)[];

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export { objectKeys, nonNullable };
