import React from 'react';
import { render, screen, waitFor } from '../../../../../../tests/test-utils';
import { getTRPCMock } from '../../../../mocks/getTrpcMock';
import { server } from '../../../../mocks/server';
import { ResetPasswordPage } from './ResetPasswordPage';

describe('Test: ResetPasswordPage', () => {
  it('should render correctly', async () => {
    render(<ResetPasswordPage />);
    server.use(getTRPCMock({ path: ['auth', 'checkPasswordChangeRequest'], response: false }));
    await waitFor(() => {
      expect(screen.getByText('Reset your password')).toBeInTheDocument();
    });
  });
});
