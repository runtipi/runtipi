#!/usr/bin/env node
import { program } from 'commander';

import { description, version } from '../package.json';
import { startWorker } from './services/watcher/watcher';
import { SystemExecutors } from './executors';

const main = async () => {
  program.description(description).version(version);

  program
    .command('watch')
    .description('Watcher script for events queue')
    .action(async () => {
      console.log('Starting watcher');
      startWorker();
    });

  program
    .command('start')
    .description('Start tipi')
    .action(async () => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.start();
    });

  program
    .command('stop')
    .description('Stop tipi')
    .action(async () => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.stop();
    });

  program
    .command('restart')
    .description('Restart tipi')
    .action(async () => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.restart();
    });

  program.parse(process.argv);
};

try {
  console.log('Starting tipi CLI');
  main();
} catch (e) {
  console.error('An error occurred:', e);
}
