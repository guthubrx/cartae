module.exports = {
  root: true,
  ignorePatterns: [
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.test.tsx',
    '**/vitest.config.ts',
    '**/tailwind.config.js',
    'apps/web/apps/**',
  ],
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: [
    '@typescript-eslint',
    'prettier',
  ],
  rules: {
    // FR: Règles personnalisées pour BigMind
    // EN: Custom rules for BigMind
    'prettier/prettier': 'error',
    'import/prefer-default-export': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // FR: Permettre les commentaires longs pour la documentation
    // EN: Allow long comments for documentation
    'max-len': ['warn', { code: 100, ignoreComments: true }],
    // FR: Désactiver import/extensions pour TypeScript (TS gère la résolution)
    // EN: Disable import/extensions for TypeScript (TS handles resolution)
    'import/extensions': 'off',
    // FR: Désactiver temporairement les règles d'import problématiques avec composite projects
    // EN: Temporarily disable import rules problematic with composite projects
    'import/no-cycle': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-duplicates': 'off',
    'import/order': 'off',
    'import/no-self-import': 'off',
    'import/no-relative-packages': 'off',
    'import/no-useless-path-segments': 'off',
    'import/no-named-as-default': 'off',
    // FR: Désactiver import/export (faux positifs avec resolver TypeScript)
    // EN: Disable import/export (false positives with TypeScript resolver)
    'import/export': 'off',
    // FR: Permettre les mutations de l'état Zustand
    // EN: Allow Zustand state mutations
    'no-param-reassign': ['error', { props: false }],
    // FR: Désactiver defaultProps (déprécié en React 18+)
    // EN: Disable defaultProps (deprecated in React 18+)
    'react/require-default-props': 'off',
    // FR: Assouplir certaines règles trop strictes pour le nettoyage technique
    // EN: Relax some overly strict rules for technical cleanup
    'no-restricted-syntax': 'off',
    'no-await-in-loop': 'off',
    'no-continue': 'off',
    'no-nested-ternary': 'off',
    'no-plusplus': 'off',
    'default-case': 'warn',
    'react/no-array-index-key': 'warn',
    'react/no-danger': 'warn',
    'react/function-component-definition': 'off',
    'react/button-has-type': 'warn',
    'react/no-unstable-nested-components': 'warn',
    '@typescript-eslint/no-use-before-define': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/naming-convention': 'warn',
    'jsx-a11y/click-events-have-key-events': 'warn',
    'jsx-a11y/no-static-element-interactions': 'warn',
    'jsx-a11y/no-noninteractive-element-interactions': 'warn',
    'jsx-a11y/label-has-associated-control': 'warn',
    'prefer-destructuring': 'warn',
    'consistent-return': 'warn',
    'react/no-unescaped-entities': 'warn',
    'no-alert': 'warn',
    'class-methods-use-this': 'warn',
    'no-promise-executor-return': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    '@typescript-eslint/no-shadow': 'warn',
    'no-empty': 'warn',
    'react/jsx-no-constructed-context-values': 'warn',
    'max-classes-per-file': 'warn',
    'no-restricted-globals': 'warn',
  },
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: [
          './tsconfig.json',
          './apps/web/tsconfig.json',
          './apps/desktop/tsconfig.json',
          './packages/*/tsconfig.json',
          './packages/viz-plugins/*/tsconfig.json',
        ],
      },
    },
  },
};
