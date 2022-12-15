module.exports = {
  plugins: ['@typescript-eslint', 'import', 'react'],
  extends: ['airbnb-base', 'airbnb-typescript/base', 'eslint:recommended', 'plugin:import/typescript', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'max-len': [1, { code: 200 }],
    'import/extensions': ['error', 'ignorePackages', { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' }],
    'no-unused-vars': [1, { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-unused-vars': [1, { argsIgnorePattern: '^_' }],
    'max-classes-per-file': 0,
    'class-methods-use-this': 0,
    'import/prefer-default-export': 0,
    'no-underscore-dangle': 0,
    '@typescript-eslint/ban-ts-comment': 0,
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.ts', '**/*.spec.ts', '**/*.factory.ts', 'esbuild.js'] }],
  },
  globals: {
    NodeJS: true,
  },
  env: { node: true, jest: true },
};
