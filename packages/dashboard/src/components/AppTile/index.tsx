import { Box, SlideFade, Tag, useColorModeValue, Tooltip } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';
import { FiChevronRight } from 'react-icons/fi';
import { MdSystemUpdateAlt } from 'react-icons/md';
import AppStatus from './AppStatus';
import AppLogo from '../AppLogo/AppLogo';
import { limitText } from '../../modules/AppStore/helpers/table.helpers';
import { AppInfo, AppStatusEnum } from '../../generated/graphql';

type AppTileInfo = Pick<AppInfo, 'id' | 'name' | 'description' | 'short_desc'>;

const AppTile: React.FC<{ app: AppTileInfo; status: AppStatusEnum; updateAvailable: boolean }> = ({ app, status, updateAvailable }) => {
  const bg = useColorModeValue('white', '#1a202c');

  return (
    <Link href={`/apps/${app.id}`} passHref>
      <SlideFade in className="flex flex-1" offsetY="20px">
        <Box bg={bg} className="flex flex-1 border-2 drop-shadow-sm rounded-lg p-3 items-center cursor-pointer group hover:drop-shadow-md transition-all">
          <AppLogo alt={`${app.name} logo`} className="mr-3 group-hover:scale-105 transition-all" id={app.id} size={100} />
          <div className="mr-3 flex-1">
            <div className="flex">
              <h3 className="font-bold text-xl mr-2">{app.name}</h3>
              {updateAvailable && (
                <Tooltip label="Update available">
                  <Tag colorScheme="gray">
                    <MdSystemUpdateAlt size={15} />
                  </Tag>
                </Tooltip>
              )}
            </div>
            <span>{limitText(app.short_desc, 50)}</span>
            <div className="flex mt-1">
              <AppStatus status={status} />
            </div>
          </div>
          <FiChevronRight className="text-slate-300" size={30} />
        </Box>
      </SlideFade>
    </Link>
  );
};

export default AppTile;
