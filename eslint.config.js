import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'supabase/**',
      'planning/**',
      'packets/**',
      'deploy/**',
      'design_handoff_wind_field_card/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // This codebase passes Netlify's untyped HandlerEvent/`any` shapes
      // around at every function boundary; turning this on would flag
      // hundreds of pre-existing, intentional uses rather than bugs.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // eslint-plugin-react-hooks 7's "recommended" preset is the React
      // Compiler ruleset (set-state-in-effect, immutability, purity,
      // etc.); this app does not use the compiler, and those rules flag
      // long-standing, working fetch-on-mount hooks throughout as
      // errors. Kept to the two rules that catch real hook bugs
      // regardless of the compiler.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  }
);
