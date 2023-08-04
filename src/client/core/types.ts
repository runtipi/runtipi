import * as Router from '../../server/routers/_app';

export type App = Omit<Router.RouterOutput['app']['getApp'], 'info'>;
export type AppWithInfo = Router.RouterOutput['app']['getApp'];
