import { extendTheme, type ThemeConfig, type Theme, withDefaultColorScheme } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

export const theme: Theme = extendTheme(
  {
    config,
    fonts: {
      heading: 'Open Sans, sans-serif',
      body: 'Open Sans, sans-serif',
    },
  },
  withDefaultColorScheme({ colorScheme: 'red' }),
) as Theme;
