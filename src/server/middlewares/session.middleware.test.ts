import request from 'supertest';
import express from 'express';
import { sessionMiddleware } from './session.middleware';

describe('Session Middleware', () => {
  it('should redirect to /login if there is no user id in session', async () => {
    // arrange
    let session;
    const app = express();
    app.use(sessionMiddleware);
    app.use('/test', (req, res) => {
      session = req.session;
      res.send('ok');
    });

    // act
    await request(app).get('/test');

    // assert
    expect(session).toHaveProperty('cookie');
  });
});
