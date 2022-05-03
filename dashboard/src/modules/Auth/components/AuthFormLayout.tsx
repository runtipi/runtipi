import { Container, Flex, SlideFade, Text } from '@chakra-ui/react';
import React from 'react';

interface IProps {
  title: string;
  description: string;
}

const AuthFormLayout: React.FC<IProps> = ({ children, title, description }) => {
  return (
    <Container maxW="1250px">
      <Flex flex={1} height="100vh" overflowY="hidden">
        <SlideFade in className="flex flex-1 flex-col justify-center items-center" offsetY="20px">
          <img className="self-center mb-5 logo" src="/tipi.png" width={512} height={512} />
          <Text className="text-xl md:text-2xl lg:text-5xl font-bold" size="3xl">
            {title}
          </Text>
          <Text className="md:text-lg lg:text-2xl text-center" color="gray.500">
            {description}
          </Text>
          {children}
        </SlideFade>
      </Flex>
    </Container>
  );
};

export default AuthFormLayout;
