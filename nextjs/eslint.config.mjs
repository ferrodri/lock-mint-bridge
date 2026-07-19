import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  js.configs.recommended,
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    rules: {
      'no-console': 'off',
      curly: 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-dupe-else-if': 'warn',
      'no-import-assign': 'warn',
      'no-setter-return': 'warn',
      'require-await': 'warn',
      quotes: ['warn', 'single', { avoidEscape: true }],
      indent: [
        'warn',
        2,
        {
          SwitchCase: 1,
          VariableDeclarator: 1,
          outerIIFEBody: 1,
          MemberExpression: 1,
          FunctionDeclaration: { parameters: 1, body: 1 },
          FunctionExpression: { parameters: 1, body: 1 },
          CallExpression: { arguments: 1 },
          ArrayExpression: 1,
          ObjectExpression: 1,
          ImportDeclaration: 1,
          flatTernaryExpressions: false,
          ignoreComments: false,
          offsetTernaryExpressions: true
        }
      ],
      semi: ['warn', 'always'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeAlias',
          format: ['PascalCase']
        },
        {
          selector: 'interface',
          format: ['PascalCase']
        },
        {
          selector: 'typeParameter',
          format: ['PascalCase']
        }
      ]
    }
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Bitrefill source kept only as local reference; not part of this app.
    'bitrefill/**'
  ])
]);

export default eslintConfig;
