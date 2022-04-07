import React from "react";
import Img from "next/image";
import Link from "next/link";
import { Button, Flex, useBreakpointValue } from "@chakra-ui/react";

interface IProps {
  onClickMenu: () => void;
}

const Header: React.FC<IProps> = ({ onClickMenu }) => {
  const buttonVisibility = useBreakpointValue<"visible" | "hidden">({
    base: "visible",
    md: "hidden",
  });

  return (
    <header>
      <Flex alignItems="center" bg="tomato" paddingLeft={5} paddingRight={5}>
        <Flex position="absolute" visibility={buttonVisibility || "visible"}>
          <Button onClick={onClickMenu}>O</Button>
        </Flex>
        <Flex justifyContent="center" flex="1">
          <Link href="/" passHref>
            <Img src="/logo.svg" alt="Tipi" width={100} height={60} />
          </Link>
        </Flex>
      </Flex>
    </header>
  );
};

export default Header;
