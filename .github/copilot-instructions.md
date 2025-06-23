- Never create a database migration file manually. The user will generate
  automatically based on the `schema.ts` file. You only need to update the
  schema.
- The project uses pnpm as a package manager. You can use `pnpm` commands to
  install dependencies, run scripts, and manage the project.
- The project is a monorepo, use -f flag to run pnpm commands in the specific
  package. (e.g. `pnpm add deepmerge -f backend`).
- When asked to add tests, do not add e2e tests unless explicitly requested.
  Focus on unit tests and integration tests.
- When adding new translation keys, add it to the `en.json` and `en-US.json`
  files. Do not add it to other language files.
- If the part you worked on is documented in the `docs` folder, update the
  documentation to reflect your changes.
- Don't use return types in functions. Let TypeScript infer the return
  type automatically.
- ALWAYS use your tools to explore first the codebase before making assumptions.
