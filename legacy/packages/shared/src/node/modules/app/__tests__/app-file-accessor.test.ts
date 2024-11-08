import { describe, expect, it } from 'vitest';

// TODO:: Add tests
//
// describe('Test: copyDataDir()', () => {
//   it('should do nothing if app does not have a data dir', async () => {
//     // arrange
//     const appConfig = createAppConfig({});
//
//     // act
//     await copyDataDir(appConfig.id);
//
//     // assert
//     expect(await pathExists(`${DATA_DIR}/apps/${appConfig.id}/data`)).toBe(false);
//   });
//
//   it('should copy data dir to app-data folder', async () => {
//     // arrange
//     const appConfig = createAppConfig({});
//     const dataDir = `${DATA_DIR}/apps/${appConfig.id}/data`;
//
//     await fs.promises.mkdir(dataDir, { recursive: true });
//     await fs.promises.writeFile(`${dataDir}/test.txt`, 'test');
//
//     // act
//     await copyDataDir(appConfig.id);
//
//     // assert
//     const appDataDir = `${APP_DATA_DIR}/${appConfig.id}`;
//     expect(await fs.promises.readFile(`${appDataDir}/data/test.txt`, 'utf8')).toBe('test');
//   });
//
//   it('should copy folders recursively', async () => {
//     // arrange
//     const appConfig = createAppConfig({});
//     const dataDir = `${DATA_DIR}/apps/${appConfig.id}/data`;
//
//     await fs.promises.mkdir(dataDir, { recursive: true });
//
//     const subDir = `${dataDir}/subdir/subsubdir`;
//     await fs.promises.mkdir(subDir, { recursive: true });
//
//     await fs.promises.writeFile(`${subDir}/test.txt`, 'test');
//     await fs.promises.writeFile(`${dataDir}/test.txt`, 'test');
//
//     // act
//     await copyDataDir(appConfig.id);
//
//     // assert
//     const appDataDir = `${APP_DATA_DIR}/${appConfig.id}`;
//     expect(await fs.promises.readFile(`${appDataDir}/data/subdir/subsubdir/test.txt`, 'utf8')).toBe('test');
//     expect(await fs.promises.readFile(`${appDataDir}/data/test.txt`, 'utf8')).toBe('test');
//   });
//
//   it('should replace the content of .template files with the content of the app.env file', async () => {
//     // arrange
//     const appConfig = createAppConfig({});
//     const dataDir = `${DATA_DIR}/apps/${appConfig.id}/data`;
//     const appDataDir = `${APP_DATA_DIR}/${appConfig.id}`;
//
//     await fs.promises.mkdir(dataDir, { recursive: true });
//     await fs.promises.mkdir(appDataDir, { recursive: true });
//     await fs.promises.writeFile(`${dataDir}/test.txt.template`, '{{TEST_VAR}}');
//     await fs.promises.writeFile(`${appDataDir}/app.env`, 'TEST_VAR=test');
//
//     // act
//     await copyDataDir(appConfig.id);
//
//     // assert
//     expect(await fs.promises.readFile(`${appDataDir}/data/test.txt`, 'utf8')).toBe('test');
//   });
// });
