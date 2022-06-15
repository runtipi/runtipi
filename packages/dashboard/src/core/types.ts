export enum RequestStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  LOADING = 'LOADING',
}

export interface IUser {
  name: string;
  email: string;
}
