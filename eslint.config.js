import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist', '.cache', 'src/generated'] },
  {
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      eslintConfigPrettier
    ],
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.d.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser
    },
    plugins: {
      'simple-import-sort': simpleImportSort
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error'
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error', // Disallow usage of any
      'no-duplicate-imports': 'error', // Imports should be on one line
      'no-console': 'error',
      'prefer-destructuring': ['error', { object: true, array: true }],
      'simple-import-sort/exports': 'error',
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // Packages
            ['^node:', '^@?\\w'],
            // Side effect imports.
            ['^\\u0000'],
            // Parent imports. Put `..` last.
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            // Other relative imports. Put same-folder imports and `.` last.
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // Style imports.
            ['^.+\\.?(css)$']
          ]
        }
      ],
      // Guards against stupidity
      'no-self-compare': 'error',
      'no-unreachable-loop': 'error',
      'no-template-curly-in-string': 'error', // Catches "${}" template strings
      'default-case': ['error', { commentPattern: '^skip\\sdefault' }], // require default switch case
      'default-case-last': 'error' // enforce default switch case last
    }
  },
  {
    // The command line scripts run in Node and report their progress on the console
    files: ['scripts/**/*.ts', 'vite.config.ts'],
    languageOptions: {
      globals: globals.node
    },
    rules: {
      'no-console': 'off'
    }
  }
);
