import { Flex, useDisclosure, Spinner, Breadcrumb, BreadcrumbItem } from '@chakra-ui/react';
import Link from 'next/link';
import React from 'react';
import { FiChevronRight } from 'react-icons/fi';
import Header from './Header';
import Menu from './Menu';
import MenuDrawer from './MenuDrawer';

interface IProps {
  loading?: boolean;
  breadcrumbs?: { name: string; href: string; current?: boolean }[];
}

const Layout: React.FC<IProps> = ({ children, loading, breadcrumbs }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const renderContent = () => {
    if (loading) {
      return (
        <Flex className="justify-center flex-1">
          <Spinner />
        </Flex>
      );
    }

    return children;
  };

  const renderBreadcrumbs = () => {
    return (
      <Breadcrumb spacing="8px" separator={<FiChevronRight color="gray.500" />}>
        {breadcrumbs?.map((breadcrumb, index) => {
          return (
            <BreadcrumbItem className="hover:underline" isCurrentPage={breadcrumb.current} key={index}>
              <Link href={breadcrumb.href}>{breadcrumb.name}</Link>
            </BreadcrumbItem>
          );
        })}
      </Breadcrumb>
    );
  };

  return (
    <Flex height="100vh" className="drop-shadow-md border-r-8" direction="column">
      <MenuDrawer isOpen={isOpen} onClose={onClose}>
        <Menu />
      </MenuDrawer>
      <Header onClickMenu={onOpen} />
      <Flex flex="1">
        <Flex className="invisible md:visible w-0 md:w-56">
          <Menu />
        </Flex>
        <Flex className="bg-slate-200 flex flex-1 p-5">
          <div className="flex-1 flex flex-col">
            {renderBreadcrumbs()}
            <div className="flex-1 ">{renderContent()}</div>
          </div>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Layout;
