import { Request, Response } from 'express';
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

export type MyContext = {
  req: Request;
  res: Response;
};
