import { Flex, useDisclosure, Spinner, Breadcrumb, BreadcrumbItem, useColorModeValue, Box } from '@chakra-ui/react';
import Head from 'next/head';
import Link from 'next/link';
import React from 'react';
import { FiChevronRight } from 'react-icons/fi';
import Header from './Header';
import Menu from './SideMenu';
import MenuDrawer from './MenuDrawer';
// import UpdateBanner from './UpdateBanner';

interface IProps {
  loading?: boolean;
  breadcrumbs?: { name: string; href: string; current?: boolean }[];
  children: React.ReactNode;
}

const Layout: React.FC<IProps> = ({ children, loading, breadcrumbs }) => {
  const { isOpen, onClose, onOpen } = useDisclosure();

  const menubg = useColorModeValue('#F1F3F4', '#202736');
  const bg = useColorModeValue('white', '#1a202c');

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
    <>
      <Head>
        <title>Tipi</title>
      </Head>
      <Flex height="100vh" direction="column">
        <MenuDrawer isOpen={isOpen} onClose={onClose}>
          <Menu />
        </MenuDrawer>
        <Header onClickMenu={onOpen} />
        <Flex flex={1}>
          <Flex height="100vh" bg={menubg} className="sticky top-0 invisible md:visible w-0 md:w-64">
            <Menu />
          </Flex>
          <Box bg={bg} className="flex-1 px-4 py-4 md:px-10 md:py-8">
            {/* <UpdateBanner /> */}
            {renderBreadcrumbs()}
            {renderContent()}
          </Box>
        </Flex>
      </Flex>
    </>
  );
};

export default Layout;
