/// <reference types="bun" />
import { afterAll, beforeAll, expect, test } from 'bun:test';
import { chromium, type Browser } from '@playwright/test';
import { build } from 'vite';
import config from '../../vite.config';

let browser: Browser;
let stylesheet: string;

beforeAll(async () => {
  const result = await build({
    configFile: false,
    root: import.meta.dirname + '/../..',
    logLevel: 'silent',
    css: config.css,
    build: {
      ...config.build,
      write: false,
      sourcemap: false,
      rolldownOptions: { input: import.meta.dirname + '/../app.css' },
    },
  });

  if (!('output' in result)) {
    throw new Error('Expected a single CSS build output');
  }

  stylesheet = result.output.flatMap((asset) => (asset.type === 'asset' && asset.fileName.endsWith('.css') ? [asset.source] : [])).join('\n');

  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
}, 20000);

for (const theme of ['light', 'dark']) {
  test(`production styles keep the dark header readable on a ${theme} page`, async () => {
    const page = await browser.newPage({ reducedMotion: 'reduce' });

    try {
      await page.setContent(`
        <body data-bs-theme="${theme}">
          <div class="page">
            <header class="text-white navbar navbar-expand-md navbar-dark navbar-overlap" data-bs-theme="dark">
              <div class="container-xl">
                <h1 class="navbar-brand">Runtipi</h1>
                <nav class="navbar-collapse"><ul class="navbar-nav">
                  <li class="nav-item active"><a class="nav-link" href="#settings">Settings</a></li>
                </ul></nav>
              </div>
            </header>
            <div class="page-wrapper"><div class="page-header text-white"><h2 class="page-title">Settings</h2></div></div>
          </div>
        </body>
      `);
      await page.addStyleTag({ content: stylesheet });

      const colors = await page.evaluate(() => {
        const brightness = (color: string) => {
          const context = document.createElement('canvas').getContext('2d')!;
          context.fillStyle = color;
          context.fillRect(0, 0, 1, 1);
          const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;

          return (red + green + blue) / 3;
        };

        const header = document.querySelector('header')!;

        return {
          header: brightness(getComputedStyle(header).backgroundColor),
          overlap: brightness(getComputedStyle(header, '::after').backgroundColor),
          navigation: brightness(getComputedStyle(document.querySelector('.nav-link')!).color),
          body: brightness(getComputedStyle(document.body).backgroundColor),
        };
      });

      expect(colors.header).toBeLessThan(70);
      expect(colors.overlap).toBeLessThan(70);
      expect(colors.navigation).toBeGreaterThan(150);
      if (theme === 'dark') {
        expect(colors.body).toBeLessThan(70);
      } else {
        expect(colors.body).toBeGreaterThan(200);
      }
    } finally {
      await page.close();
    }
  });
}
