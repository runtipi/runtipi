import { Box, SlideFade, Image, useColorModeValue } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';
import { FiChevronRight } from 'react-icons/fi';
import { AppConfig } from '@runtipi/common';
import AppStatus from './AppStatus';

const AppTile: React.FC<{ app: AppConfig }> = ({ app }) => {
  const bg = useColorModeValue('white', '#1a202c');

  return (
    <Link href={`/apps/${app.id}`} passHref>
      <SlideFade in className="flex flex-1" offsetY="20px">
        <Box minWidth={400} bg={bg} className="flex flex-1 border-2 drop-shadow-sm rounded-lg p-3 items-center cursor-pointer group hover:drop-shadow-md transition-all">
          <Image alt={`${app.name} logo`} className="rounded-md drop-shadow mr-3 group-hover:scale-105 transition-all" src={app.image} width={100} height={100} />
          <div className="mr-3 flex-1">
            <h3 className="font-bold text-xl">{app.name}</h3>
            <span>{app.short_desc}</span>
            {app.installed && (
              <div className="flex mt-1">
                <AppStatus status={app.status} />
              </div>
            )}
          </div>
          <FiChevronRight className="text-slate-300" size={30} />
        </Box>
      </SlideFade>
    </Link>
  );
};

export default AppTile;
