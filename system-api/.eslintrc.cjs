module.exports = {
  env: { node: true },
  extends: ['airbnb-base', 'eslint:recommended', 'plugin:import/typescript'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    'arrow-body-style': 0,
    'no-restricted-exports': 0,
    'max-len': [{ code: 200 }],
    'import/extensions': ['error', 'ignorePackages', { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' }],
  },
};
