const objectKeys = <T extends object>(obj: T): (keyof T)[] => Object.keys(obj) as (keyof T)[];

/**
 * Type guard to check if a value is not null or undefined
 *
 * @param {any} value - The value to check
 * @returns {value is NonNullable<any>} - True if the value is not null or undefined
 */
function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export { objectKeys, nonNullable };
