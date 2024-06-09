export interface ICommand<T = void> {
  execute(): Promise<T>;
}
