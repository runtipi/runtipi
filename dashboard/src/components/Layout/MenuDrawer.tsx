import { Drawer, DrawerBody, DrawerCloseButton, DrawerContent, DrawerFooter, DrawerHeader, DrawerOverlay } from '@chakra-ui/react';
import React from 'react';

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

const MenuDrawer: React.FC<IProps> = ({ children, isOpen, onClose }) => {
  return (
    <Drawer size="xs" isOpen={isOpen} placement="left" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>My Tipi</DrawerHeader>
        <DrawerBody>{children}</DrawerBody>
        <DrawerFooter>
          <div>Github</div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default MenuDrawer;
