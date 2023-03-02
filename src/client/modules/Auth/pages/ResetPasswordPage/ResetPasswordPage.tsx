import React from 'react';
import { ResetPasswordContainer } from '../../containers/ResetPasswordContainer/ResetPasswordContainer';
import { trpc } from '../../../../utils/trpc';
import { ErrorPage } from '../../../../components/ui/ErrorPage';

export const ResetPasswordPage = () => {
  const { data, error } = trpc.auth.checkPasswordChangeRequest.useQuery();

  // TODO: Add loading state
  return (
    <>
      {error && <ErrorPage error={error.message} />}
      <ResetPasswordContainer isRequested={Boolean(data)} />
    </>
  );
};
