// Configuration ESLint v9+ pour MotiveMe
export default [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        process: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error'
    },
    ignores: [
      'node_modules/**',
      'dist/**',
      '*.config.js',
      'tests/**'
    ]
  }
];