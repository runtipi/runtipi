module.exports = {
  extends: ['next/core-web-vitals', 'airbnb-typescript', 'eslint:recommended', 'plugin:import/typescript'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'arrow-body-style': 0,
    'no-restricted-exports': 0,
    'max-len': [1, { code: 200 }],
    'import/extensions': ['error', 'ignorePackages', { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' }],
  },
  globals: {
    JSX: true,
  },
};
