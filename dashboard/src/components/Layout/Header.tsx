import React from 'react';
import Link from 'next/link';
import { Flex } from '@chakra-ui/react';
import { FiMenu } from 'react-icons/fi';

interface IProps {
  onClickMenu: () => void;
}

const Header: React.FC<IProps> = ({ onClickMenu }) => {
  return (
    <header style={{ width: '100%' }} className="flex">
      <Flex className="items-center bg-gray-700 drop-shadow-md px-5 flex-1">
        <div onClick={onClickMenu} className="visible md:invisible absolute cursor-pointer py-2">
          <FiMenu color="white" />
        </div>
        <Flex justifyContent="center" flex="1">
          <Link href="/" passHref>
            <img src="/logo.png" alt="Tipi" width={230} height={60} />
          </Link>
        </Flex>
      </Flex>
    </header>
  );
};

export default Header;
