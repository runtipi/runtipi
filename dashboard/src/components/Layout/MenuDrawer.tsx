import { Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerHeader, DrawerOverlay, useColorModeValue } from '@chakra-ui/react';
import React from 'react';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDrawer: React.FC<IProps> = ({ children, isOpen, onClose }) => {
  const menubg = useColorModeValue('#F1F3F4', '#202736');

  return (
    <Drawer size="xs" isOpen={isOpen} placement="left" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent bg={menubg}>
        <DrawerCloseButton />
        <DrawerHeader>My Tipi</DrawerHeader>
        <DrawerBody display="flex">{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

export default MenuDrawer;
