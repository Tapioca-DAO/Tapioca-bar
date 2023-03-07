module.exports = {
    env: {
        browser: false,
        es2021: true,
        mocha: true,
        node: true,
    },
    plugins: ['@typescript-eslint', 'prettier'],
    extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
    },
    rules: {
        'prettier/prettier': [
            'error',
            {
                trailingComma: 'all',
                singleQuote: true,
                printWidth: 80,
                endOfLine: 'auto',
                useTabs: false,
                tabWidth: 4,
            },
        ],
        'comma-dangle': [2, 'always-multiline'],
        semi: ['error', 'always'],
        'comma-spacing': ['error', { before: false, after: true }],
        quotes: ['error', 'single'],
        indent: 'off',
        'key-spacing': ['error', { afterColon: true }],
        'no-multi-spaces': ['error'],
        'no-multiple-empty-lines': ['error', { max: 2 }],
        'prefer-const': 'off',
    },
};
