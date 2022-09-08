import React from 'react';
import Link from 'next/link';
import { Flex } from '@chakra-ui/react';
import { FiMenu } from 'react-icons/fi';
import { getUrl } from '../../core/helpers/url-helpers';

interface IProps {
  onClickMenu: () => void;
}

const Header: React.FC<IProps> = ({ onClickMenu }) => {
  return (
    <header style={{ width: '100%' }} className="flex h-12 md:h-0">
      <Flex className="items-center border-b-2 bg-graycool px-5 flex-1 py-2">
        <div onClick={onClickMenu} className="visible md:invisible absolute cursor-pointer py-2">
          <FiMenu color="black" />
        </div>
        <Flex justifyContent="center" flex="1">
          <Link href="/" passHref>
            <img src={getUrl('tipi.png')} alt="Tipi Logo" width={30} height={30} />
          </Link>
        </Flex>
      </Flex>
    </header>
  );
};

export default Header;
