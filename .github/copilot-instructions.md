- Never create a database migration file manually. The user will generate
  automatically based on the `schema.ts` file. You only need to update the
  schema.
- The project uses bun as a package manager. You can use `bun` commands to
  install dependencies, run scripts, and manage the project.
- When asked to add tests, do not add e2e tests unless explicitly requested.
  Focus on unit tests and integration tests.
- When adding new translation keys, add it to the `en.json` and `en-US.json`
  files. Do not add it to other language files.
- Don't use return types in functions. Let TypeScript infer the return
  type automatically.
- ALWAYS use your tools to explore first the codebase before making assumptions.
- Never try to run the development server the user is already running it with hot
  reload.
