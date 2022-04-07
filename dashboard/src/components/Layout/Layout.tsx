import {
  Button,
  Flex,
  useBreakpointValue,
  useDisclosure,
} from "@chakra-ui/react";
import React from "react";
import Header from "./Header";
import Menu from "./Menu";
import MenuDrawer from "./MenuDrawer";

const Layout: React.FC = ({ children }) => {
  const menuWidth = useBreakpointValue({ base: 0, md: 200 });
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Flex height="100vh" bg="green.500" direction="column">
      <MenuDrawer isOpen={isOpen} onClose={onClose}>
        <Menu />
      </MenuDrawer>
      <Header onClickMenu={onOpen} />
      <Flex flex="1">
        <Flex width={menuWidth} bg="blue.500">
          <Menu />
        </Flex>
        <Flex flex="1" padding={5} bg="yellow.300">
          {children}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default Layout;
