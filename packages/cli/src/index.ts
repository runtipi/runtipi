#!/usr/bin/env node
import { program } from 'commander';

import chalk from 'chalk';
import { description, version } from '../package.json';
import { AppExecutors, SystemExecutors } from './executors';

const main = async () => {
  program.description(description).version(version);

  program.name('./runtipi-cli').usage('<command> [options]');

  program
    .command('start')
    .description('Start tipi')
    .option('--env-file <envFile>', 'Specify a custom .env file to load')
    .addHelpText('after', '\nExample call: sudo ./runtipi-cli start')
    .action(async (opts: { envFile: string }) => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.start({ envFilePath: opts.envFile });
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
    .option('--env-file <envFile>', 'Specify a custom .env file to load')
    .action(async (opts: { envFile: string }) => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.restart({ envFilePath: opts.envFile });
    });

  program
    .command('update')
    .description('Update tipi')
    .argument('<target>', 'Target to update')
    .option('--env-file <envFile>', 'Specify a custom .env file to load')
    .action(async (target: string, opts: { envFile: string }) => {
      const systemExecutors = new SystemExecutors();
      await systemExecutors.update({ target, envFilePath: opts.envFile });
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
          await appExecutors.startApp(app);
          break;
        case 'stop':
          await appExecutors.stopApp(app);
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
