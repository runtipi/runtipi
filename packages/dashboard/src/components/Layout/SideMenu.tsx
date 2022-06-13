import { AiOutlineDashboard, AiOutlineSetting, AiOutlineAppstore } from 'react-icons/ai';
import { FaAppStore, FaRegMoon } from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import Package from '../../../package.json';
import { Box, Divider, Flex, List, ListItem, Switch, useColorMode } from '@chakra-ui/react';
import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { IconType } from 'react-icons';
import { useAuthStore } from '../../state/authStore';

const SideMenu: React.FC = () => {
  const router = useRouter();
  const { colorMode, setColorMode } = useColorMode();
  const { logout } = useAuthStore();
  const path = router.pathname.split('/')[1];

  const renderMenuItem = (title: string, name: string, Icon: IconType) => {
    const selected = path === name;

    const itemClass = clsx('mx-3 border-transparent rounded-lg p-3 transition-colors border-1', {
      'drop-shadow-sm border-gray-200': selected && colorMode === 'light',
      'bg-white': selected && colorMode === 'light',
    });

    return (
      <Link href={`/${name}`} passHref>
        <div className={itemClass}>
          <ListItem className={'flex items-center cursor-pointer hover:font-bold'}>
            <Icon size={20} className={clsx('mr-3', { 'text-red-600': selected && colorMode === 'light', 'text-red-200': selected && colorMode === 'dark' })} />
            <p className={clsx({ 'font-bold': selected, 'text-red-600': selected && colorMode === 'light', 'text-red-200': selected && colorMode === 'dark' })}>{title}</p>
          </ListItem>
        </div>
      </Link>
    );
  };

  const handleChangeColorMode = (checked: boolean) => {
    setColorMode(checked ? 'dark' : 'light');
  };

  return (
    <Box className="flex-1 flex flex-col p-0 md:p-4">
      <img className="self-center mb-5 logo mt-0 md:mt-5" src="/tipi.png" width={512} height={512} />
      <List spacing={3} className="pt-5">
        {renderMenuItem('Dashboard', '', AiOutlineDashboard)}
        {renderMenuItem('My Apps', 'apps', AiOutlineAppstore)}
        {renderMenuItem('App Store', 'app-store', FaAppStore)}
        {renderMenuItem('Settings', 'settings', AiOutlineSetting)}
      </List>
      <Divider className="my-3" />
      <Flex flex="1" />
      <List>
        <div className="mx-3">
          <ListItem onClick={logout} className="cursor-pointer hover:font-bold flex items-center mb-5">
            <FiLogOut size={20} className="mr-3" />
            <p className="flex-1">Log out</p>
          </ListItem>
          <ListItem className="flex items-center">
            <FaRegMoon size={20} className="mr-3" />
            <p className="flex-1">Dark mode</p>
            <Switch isChecked={colorMode === 'dark'} onChange={(event) => handleChangeColorMode(event.target.checked)} />
          </ListItem>
        </div>
      </List>
      <div className="pb-1 text-center text-sm text-gray-400 mt-5">Tipi version {Package.version}</div>
    </Box>
  );
};

export default SideMenu;
