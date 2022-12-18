import React from 'react';
import { Html, Head, Main, NextScript } from 'next/document';

import { getUrl } from '../core/helpers/url-helpers';

export default function MyDocument() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" sizes="180x180" href={getUrl('apple-touch-icon.png')} />
        <link rel="icon" type="image/png" sizes="32x32" href={getUrl('favicon-32x32.png')} />
        <link rel="icon" type="image/png" sizes="16x16" href={getUrl('favicon-16x16.png')} />
        <link rel="manifest" href={getUrl('site.webmanifest')} />
        <link rel="mask-icon" href={getUrl('safari-pinned-tab.svg')} color="#5bbad5" />
        <script src="https://cdn.jsdelivr.net/npm/@tabler/core@latest/dist/js/tabler.min.js" async />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
      </Head>
      <body className="border-top-wide border-primary">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
