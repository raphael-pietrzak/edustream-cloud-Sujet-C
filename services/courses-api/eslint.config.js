export default [
  {
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { process: 'readonly' } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
    },
  },
];
