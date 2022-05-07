declare module 'su-exec' {
  export function execFile(path: string, args: string[], options: {}, callback?: any): void;
  export function init(): void;
}
