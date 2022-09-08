import React from 'react';
import { Html, Head, Main, NextScript } from 'next/document';
import { ColorModeScript } from '@chakra-ui/react';
import { theme } from '../styles/theme';
import { getUrl } from '../core/helpers/url-helpers';

export default function MyDocument() {
  return (
    <Html lang="en">
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href={getUrl('apple-touch-icon.png')} />
        <link rel="icon" type="image/png" sizes="32x32" href={getUrl('favicon-32x32.png')} />
        <link rel="icon" type="image/png" sizes="16x16" href={getUrl('favicon-16x16.png')} />
        <link rel="manifest" href={getUrl('site.webmanifest')} />
        <link rel="mask-icon" href={getUrl('safari-pinned-tab.svg')} color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <body>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
