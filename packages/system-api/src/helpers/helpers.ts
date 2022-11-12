const objectKeys = <T extends object>(obj: T): (keyof T)[] => Object.keys(obj) as (keyof T)[];

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => value !== null && value !== undefined;

export default { objectKeys };
