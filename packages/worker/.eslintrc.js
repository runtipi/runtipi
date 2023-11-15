module.exports = {
  root: true,
  plugins: ['@typescript-eslint', 'import'],
  extends: ['plugin:@typescript-eslint/recommended', 'airbnb', 'airbnb-typescript', 'eslint:recommended', 'plugin:import/typescript', 'prettier'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    'import/prefer-default-export': 0,
    'class-methods-use-this': 0,
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        '': 'never',
        js: 'never',
        jsx: 'never',
        ts: 'never',
        tsx: 'never',
      },
    ],
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: ['build.js', '**/*.test.{ts,tsx}', '**/mocks/**', '**/__mocks__/**', '**/*.setup.{ts,js}', '**/*.config.{ts,js}', '**/tests/**'],
      },
    ],
    'arrow-body-style': 0,
    'no-underscore-dangle': 0,
    'no-console': 0,
  },
  globals: {
    NodeJS: true,
  },
};
