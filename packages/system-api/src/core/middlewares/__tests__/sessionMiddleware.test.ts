import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import TipiCache from '../../../config/TipiCache';
import { getConfig } from '../../config/TipiConfig';
import getSessionMiddleware from '../sessionMiddleware';

describe('SessionMiddleware', () => {
  it('Should append session to request object if a valid token is present', async () => {
    // Arrange
    const session = faker.random.alphaNumeric(32);
    const userId = faker.datatype.number();
    await TipiCache.set(session, userId.toString());
    const token = jwt.sign({ id: userId, session }, getConfig().jwtSecret);
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;
    const next = jest.fn();
    const res = {} as Response;

    // Act
    await getSessionMiddleware(req, res, next);

    // Assert
    expect(req).toHaveProperty('session');
    expect(req.session).toHaveProperty('id');
    expect(req.session).toHaveProperty('userId');
    expect(req.session.id).toBe(session);
    expect(req.session.userId).toBe(userId);
    expect(next).toHaveBeenCalled();
  });

  it('Should not append session to request object if a invalid token is present', async () => {
    // Arrange
    const session = faker.random.alphaNumeric(32);
    const userId = faker.datatype.number();
    await TipiCache.set(session, userId.toString());
    const token = jwt.sign({ id: userId, session }, 'invalidSecret');
    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as Request;
    const next = jest.fn();
    const res = {} as Response;

    // Act
    await getSessionMiddleware(req, res, next);

    // Assert
    expect(req).toHaveProperty('session');
    expect(req.session).not.toHaveProperty('id');
    expect(req.session).not.toHaveProperty('userId');
    expect(next).toHaveBeenCalled();
  });

  it('Should not append session to request object if a token is not present', async () => {
    // Arrange
    const req = {
      headers: {},
    } as Request;
    const next = jest.fn();
    const res = {} as Response;

    // Act
    await getSessionMiddleware(req, res, next);

    // Assert
    expect(req).toHaveProperty('session');
    expect(req.session).not.toHaveProperty('id');
    expect(req.session).not.toHaveProperty('userId');
    expect(next).toHaveBeenCalled();
  });
});
