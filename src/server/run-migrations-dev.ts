import { runPostgresMigrations } from './run-migration';

const main = async () => {
  await runPostgresMigrations();
};

main().catch(() => {
  process.exit(1);
});
