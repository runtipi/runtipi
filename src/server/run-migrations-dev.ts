import { runPostgresMigrations } from './run-migration';

const main = async () => {
  await runPostgresMigrations();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
