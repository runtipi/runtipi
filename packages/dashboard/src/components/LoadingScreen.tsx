import { Flex, Spinner } from '@chakra-ui/react';
import React from 'react';

const LoadingScreen = () => {
  return (
    <Flex height="100vh" alignItems="center" justifyContent="center">
      <Spinner size="lg" />
    </Flex>
  );
};

export default LoadingScreen;
