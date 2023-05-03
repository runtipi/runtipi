import React from 'react';
import { render, screen } from '../../../../tests/test-utils';
import { Layout } from './Layout';

const pushFn = jest.fn();
jest.mock('next/router', () => {
  const actualRouter = jest.requireActual('next-router-mock');

  return {
    ...actualRouter,
    useRouter: () => ({
      ...actualRouter.useRouter(),
      push: pushFn,
    }),
  };
});

describe('Test: Layout', () => {
  it('should render correctly its children', () => {
    render(<Layout>test</Layout>);

    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
