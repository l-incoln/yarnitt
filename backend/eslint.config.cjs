// backend/eslint.config.cjs
// Flat ESLint config that ensures TypeScript files are parsed with @typescript-eslint/parser.
// The parser must be required (module object), not a path string (which causes the TypeError seen).

const fs = require('fs');
const path = require('path');

const hasTsConfig = fs.existsSync(path.resolve(process.cwd(), 'tsconfig.json'));

// Require the parser module (object exposing parse or parseForESLint).
let tsParser = null;
try {
  tsParser = require('@typescript-eslint/parser');
} catch (e) {
  // fallback to espree (ESLint's default parser) so ESLint still runs without crashing
  try {
    tsParser = require('espree');
  } catch (err) {
    tsParser = null;
  }
}

// Require the plugin if available (optional)
let tsPlugin = null;
try {
  tsPlugin = require('@typescript-eslint/eslint-plugin');
} catch (e) {
  tsPlugin = null;
}

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**'],
  },

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser, // must be module object (not a resolved path)
      parserOptions: Object.assign(
        {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
        hasTsConfig
          ? {
              project: path.resolve(process.cwd(), 'tsconfig.json'),
              tsconfigRootDir: process.cwd(),
            }
          : {}
      ),
    },
    plugins: tsPlugin ? { '@typescript-eslint': tsPlugin } : {},
    // Minimal rules to avoid churn while enabling TypeScript parsing.
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },

  // JavaScript files
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {},
  },
];