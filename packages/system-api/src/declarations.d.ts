declare namespace Express {
  interface Request {
    session: {
      userId?: number;
      id?: string;
    };
    [key: string]: unknown;
  }
}
