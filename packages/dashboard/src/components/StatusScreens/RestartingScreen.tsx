import { Flex, Spinner, Text } from '@chakra-ui/react';
import React from 'react';

const RestartingScreen = () => {
  return (
    <Flex height="100vh" direction="column" alignItems="center" justifyContent="center">
      <Text fontSize="2xl">Your system is restarting...</Text>
      <Text color="gray.500">Please do not refresh this page</Text>
      <Spinner size="lg" className="mt-5" />
    </Flex>
  );
};

export default RestartingScreen;
