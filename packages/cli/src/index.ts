#!/usr/bin/env node
import { program } from 'commander';

import chalk from 'chalk';
import { description, version } from '../package.json';
import { startWorker } from './services/watcher/watcher';
import { AppExecutors, SystemExecutors } from './executors';

const main = async () => {
  program.description(description).version(version);

  program.name('./runtipi-cli').usage('<command> [options]');

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
    .addHelpText('after', '\nExample call: sudo ./runtipi-cli start')
    .option('--no-sudo', 'Skip sudo usage')
    .action(async (options) => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.start(options.sudo);
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

  program
    .command('clean-logs')
    .description('Clean logs')
    .action(async () => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.cleanLogs();
    });

  // Start app: ./cli app start <app>
  // Stop app: ./cli app stop <app>
  program
    .command('app [command] <app>')
    .addHelpText('after', '\nExample call: sudo ./runtipi-cli app start <app>')
    .description('App management')
    .action(async (command, app) => {
      const appExecutors = new AppExecutors();
      switch (command) {
        case 'start':
          await appExecutors.startApp(app, {});
          break;
        case 'stop':
          await appExecutors.stopApp(app, {}, true);
          break;
        default:
          console.log(chalk.red('✗'), 'Unknown command');
      }
    });

  program.parse(process.argv);
};

try {
  console.log(chalk.green('Welcome to Tipi CLI ✨'));
  main();
} catch (e) {
  console.error('An error occurred:', e);
}
