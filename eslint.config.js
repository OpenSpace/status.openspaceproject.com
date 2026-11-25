import { reactLint } from '@openspace/shared-configs/eslint/react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', '.cache', 'src/generated'] },
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['**/*.d.ts'],
    extends: [reactLint, reactHooks.configs.flat['recommended-latest']],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser
    },
    rules: {
      'no-console': 'error'
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
