#!/usr/bin/env node
import { program } from 'commander';

import chalk from 'chalk';
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
    .option('--no-permissions', 'Skip permissions check')
    .action(async (options) => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.start(options.permissions);
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

  program
    .command('update')
    .description('Update tipi')
    .argument('<target>', 'Target to update')
    .action(async (target) => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.update(target);
    });

  program
    .command('reset-password')
    .description('Reset password')
    .action(async () => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.resetPassword();
      console.log(chalk.green('✓'), 'Password reset request created. Head back to the dashboard to set a new password.');
    });

  program.parse(process.argv);
};

try {
  console.log(chalk.green('Welcome to Tipi CLI ✨'));
  main();
} catch (e) {
  console.error('An error occurred:', e);
}
