import js from '@eslint/js'
import nextPlugin from '@next/eslint-plugin-next'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'
import prettierConfig from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',
      },
      globals: {
        process: 'readonly',
        console: 'readonly',
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        KeyboardEvent: 'readonly',
        HTMLElement: 'readonly',
        HTMLVideoElement: 'readonly',
        HTMLButtonElement: 'readonly',
        React: 'readonly',
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      '@typescript-eslint': tsPlugin,
      import: importPlugin,
    },
    rules: {
      // Next.js rules
      '@next/next/no-img-element': 'off',
      '@next/next/no-unescaped-entities': 'off',
      '@next/next/no-html-link-for-pages': 'error',

      // TypeScript rules
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // React rules
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',

      // Import rules
      'import/no-anonymous-default-export': 'off',
      'import/newline-after-import': ['error', { count: 1 }],

      // Code style rules
      'lines-around-comment': [
        'error',
        {
          beforeLineComment: true,
          beforeBlockComment: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
        },
      ],
      'newline-before-return': 'error',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      import: importPlugin,
    },
    rules: {
      // Next.js rules
      '@next/next/no-img-element': 'off',
      '@next/next/no-unescaped-entities': 'off',
      '@next/next/no-html-link-for-pages': 'error',

      // React rules
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',

      // Import rules
      'import/no-anonymous-default-export': 'off',
      'import/newline-after-import': ['error', { count: 1 }],

      // Code style rules
      'lines-around-comment': [
        'error',
        {
          beforeLineComment: true,
          beforeBlockComment: true,
          allowBlockStart: true,
          allowClassStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
        },
      ],
      'newline-before-return': 'error',
    },
  },
  {
    files: ['src/iconify-bundle/*'],
    rules: { '@typescript-eslint/no-var-requires': 'off' },
  },
  prettierConfig,
]
