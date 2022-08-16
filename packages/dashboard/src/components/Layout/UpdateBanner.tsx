import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, CloseButton } from '@chakra-ui/react';
import React from 'react';
import { useVersionQuery } from '../../generated/graphql';

const UpdateBanner = () => {
  const { data, loading } = useVersionQuery();

  const isLatest = data?.version.latest === data?.version.current;

  if (isLatest || (loading && !data?.version)) {
    return null;
  }

  const onClose = () => {};

  return (
    <div>
      <Alert status="info" className="flex mb-3">
        <AlertIcon />
        <Box className="flex-1">
          <AlertTitle>New version available!</AlertTitle>
          <AlertDescription>
            There is a new version of Tipi available ({data?.version.latest}). Visit{' '}
            <a className="text-blue-600" target="_blank" rel="noreferrer" href={'https://github.com/meienberger/runtipi/releases/latest'}>
              Github
            </a>{' '}
            for update instructions.
          </AlertDescription>
        </Box>
        <CloseButton alignSelf="flex-start" position="relative" right={-1} top={-1} onClick={onClose} />
      </Alert>
    </div>
  );
};

export default UpdateBanner;
