import { Flex, ScaleFade } from '@chakra-ui/react';
import React from 'react';
import { AppInfo } from '../../../generated/graphql';

interface IProps {
  app: AppInfo;
  show: boolean;
}

const FeaturedCard: React.FC<IProps> = ({ app, show }) => {
  return (
    <ScaleFade initialScale={0.9} in={show}>
      <Flex
        className="overflow-hidden absolute left-0 right-0 border-2"
        height={200}
        rounded="md"
        shadow="md"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80)',
        }}
      >
        <div className="relative flex flex-1 w-max lg:bg-gradient-to-r from-white via-white">
          <div className="flex absolute bottom-0 flex-row p-3">
            <img src={app.image} width={80} height={80} className="rounded-lg mr-2" />
            <div className="self-end mb-1">
              <div className="font-bold text-xl">{app.name}</div>
              <div className="text-md">{app.short_desc}</div>
            </div>
          </div>
        </div>
      </Flex>
    </ScaleFade>
  );
};

export default FeaturedCard;
