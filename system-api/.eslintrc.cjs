module.exports = {
  env: { node: true },
  extends: ['airbnb-typescript', 'eslint:recommended', 'plugin:import/typescript'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import', 'react'],
  rules: {
    'arrow-body-style': 0,
    'no-restricted-exports': 0,
    'max-len': [1, { code: 200 }],
    'import/extensions': ['error', 'ignorePackages', { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' }],
  },
};
