module.exports = {
  plugins: ['@typescript-eslint', 'import', 'react', 'jsx-a11y'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'next/core-web-vitals',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:jsx-a11y/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 1,
    'no-restricted-exports': 0,
    'no-redeclare': 0, // already handled by @typescript-eslint/no-redeclare
    'react/display-name': 0,
    'react/prop-types': 0,
    'react/function-component-definition': 0,
    'react/require-default-props': 0,
    'import/prefer-default-export': 0,
    'react/jsx-props-no-spreading': 0,
    'react/no-unused-prop-types': 0,
    'react/button-has-type': 0,
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: [
          'esbuild.js',
          'e2e/**',
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
          '**/*.factory.{ts,tsx}',
          '**/mocks/**',
          '**/__mocks__/**',
          '**/tests/**',
          '**/*.d.ts',
          '**/*.workspace.ts',
          '**/*.setup.{ts,js}',
          '**/*.config.{ts,js}',
        ],
      },
    ],
    'no-underscore-dangle': 0,
    'arrow-body-style': 0,
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
  },
  overrides: [
    {
      files: ['*.test.ts', '*.test.tsx'],
      plugins: ['jest', 'jest-dom', 'testing-library'],
      extends: ['plugin:jest-dom/recommended', 'plugin:testing-library/react'],
    },
    {
      files: ['**/*.json', '*.json5', '*.jsonc'],
      plugins: ['jsonc'],
      extends: ['plugin:jsonc/recommended-with-json', 'plugin:jsonc/prettier'],
      parser: 'jsonc-eslint-parser',
      rules: {
        // Disable all @typescript-eslint rules as they don't apply here
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/dot-notation': 'off',
        '@typescript-eslint/no-implied-eval': 'off',
        '@typescript-eslint/no-throw-literal': 'off',
        '@typescript-eslint/return-await': 'off',
        // jsonc rules
        'jsonc/sort-keys': 2,
        'jsonc/key-name-casing': 1,
      },
    },
  ],
  globals: {
    JSX: true,
    NodeJS: true,
  },
};
