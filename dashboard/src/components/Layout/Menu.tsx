import { AiOutlineDashboard, AiOutlineSetting, AiOutlineAppstore } from 'react-icons/ai';
import { Divider, List, ListItem } from '@chakra-ui/react';
import React from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { IconType } from 'react-icons';

const SideMenu: React.FC = () => {
  const router = useRouter();

  const path = router.pathname.split('/')[1];

  const renderMenuItem = (title: string, name: string, Icon: IconType) => {
    const selected = path === name;

    return (
      <Link href={`/${name}`} passHref>
        <div className={clsx('mx-3  rounded-lg p-3 transition-colors', { 'bg-slate-200 drop-shadow-sm': selected })}>
          <ListItem className={'flex items-center cursor-pointer hover:font-bold'}>
            <Icon size={20} className="mr-3" />
            <p className={clsx({ 'font-bold': selected })}>{title}</p>
          </ListItem>
        </div>
      </Link>
    );
  };

  return (
    <List spacing={3} className="pt-5 flex-1 bg-white md:border-r-2">
      {renderMenuItem('Dashboard', '', AiOutlineDashboard)}
      <Divider />
      {renderMenuItem('Apps', 'apps', AiOutlineAppstore)}
      <Divider />
      {renderMenuItem('Settings', 'settings', AiOutlineSetting)}
    </List>
  );
};

export default SideMenu;
