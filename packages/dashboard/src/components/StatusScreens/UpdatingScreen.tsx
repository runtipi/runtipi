import { Text, Flex, Spinner } from '@chakra-ui/react';
import React from 'react';

const UpdatingScreen = () => {
  return (
    <Flex height="100vh" direction="column" alignItems="center" justifyContent="center">
      <Text fontSize="2xl">Your system is updating...</Text>
      <Text color="gray.500">Please do not refresh this page</Text>
      <Spinner size="lg" className="mt-5" />
    </Flex>
  );
};

export default UpdatingScreen;
