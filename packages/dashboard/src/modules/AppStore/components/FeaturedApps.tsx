import { AppConfig } from '@runtipi/common';
import React from 'react';
import { Box, Button, Flex } from '@chakra-ui/react';
import FeaturedCard from './FeaturedCard';

interface IProps {
  apps: AppConfig[];
}

const FeaturedApps: React.FC<IProps> = ({ apps }) => {
  const [appIndex, setAppIndex] = React.useState(0);

  return (
    <Flex className="flex-col relative">
      <Box className="relative mb-3" height={200}>
        {apps.map((app, index) => {
          return <FeaturedCard show={index === appIndex} key={app.id} app={app} />;
        })}
      </Box>
      <Button onClick={() => setAppIndex(1)}>Next</Button>
    </Flex>
  );
};

export default FeaturedApps;
