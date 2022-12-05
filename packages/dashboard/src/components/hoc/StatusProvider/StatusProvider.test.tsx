import { rest } from 'msw';
import React from 'react';
import { render, screen, waitFor } from '../../../../tests/test-utils';
import { server } from '../../../mocks/server';
import { StatusProvider } from './StatusProvider';

const reloadFn = jest.fn();

jest.mock('next/router', () => {
  const actualRouter = jest.requireActual('next-router-mock');

  return {
    ...actualRouter,
    reload: () => reloadFn(),
  };
});

describe('Test: StatusProvider', () => {
  it("should render it's children when system is RUNNING", async () => {
    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('system running')).toBeInTheDocument();
    });
  });

  it('should render StatusScreen when system is RESTARTING', async () => {
    server.use(rest.get('/api/status', (req, res, ctx) => res(ctx.delay(200), ctx.status(200), ctx.json({ status: 'RESTARTING' }))));
    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Your system is restarting...')).toBeInTheDocument();
    });
  });

  it('should render StatusScreen when system is UPDATING', async () => {
    server.use(rest.get('/api/status', (req, res, ctx) => res(ctx.delay(200), ctx.status(200), ctx.json({ status: 'UPDATING' }))));
    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Your system is updating...')).toBeInTheDocument();
    });
  });

  it('should reload the page when system is RUNNING after being something else than RUNNING', async () => {
    server.use(rest.get('/api/status', (req, res, ctx) => res(ctx.delay(200), ctx.status(200), ctx.json({ status: 'UPDATING' }))));
    render(
      <StatusProvider>
        <div>system running</div>
      </StatusProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Your system is updating...')).toBeInTheDocument();
    });

    server.use(rest.get('/api/status', (req, res, ctx) => res(ctx.delay(200), ctx.status(200), ctx.json({ status: 'RUNNING' }))));
    await waitFor(() => {
      expect(reloadFn).toHaveBeenCalled();
    });
  });
});
