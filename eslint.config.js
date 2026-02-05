/**
 * ESLint Configuration
 * 
 * Enforces consistent code style and catches common errors.
 * Based on recommended JavaScript practices with custom rules
 * tailored for Discord.js bot development.
 * 
 * @type {import('eslint').Linter.FlatConfig[]}
 */

const js = require('@eslint/js');

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
		rules: {
			// Spacing rules for readability
			'arrow-spacing': ['warn', { before: true, after: true }],
			'comma-spacing': 'error',
			'keyword-spacing': 'error',
			'space-before-blocks': 'error',
			'space-infix-ops': 'error',
			'space-unary-ops': 'error',
			'space-in-parens': 'error',
			'object-curly-spacing': ['error', 'always'],
			'space-before-function-paren': ['error', {
				anonymous: 'never',
				named: 'never',
				asyncArrow: 'always',
			}],

			// Code style consistency
			'brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
			'comma-dangle': ['error', 'always-multiline'],
			'comma-style': 'error',
			'dot-location': ['error', 'property'],
			indent: ['error', 'tab', { SwitchCase: 1 }],
			quotes: ['error', 'single', { avoidEscape: true }],
			semi: ['error', 'always'],
			'spaced-comment': ['error', 'always', { markers: ['/'] }],

			// Best practices
			curly: ['error', 'multi-line', 'consistent'],
			'no-empty-function': 'error',
			'no-floating-decimal': 'error',
			'no-lonely-if': 'error',
			'no-multi-spaces': 'error',
			'no-shadow': ['error', { allow: ['err', 'resolve', 'reject'] }],
			'no-var': 'error',
			'prefer-const': 'error',
			yoda: 'error',

			// Whitespace cleanup
			'no-trailing-spaces': ['error'],
			'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],

			// Adjusted for this project
			'no-console': 'off', // Console logging is needed for bot status
			'no-inline-comments': 'off', // Allow inline comments for clarity
			'no-undef': 'off', // Node.js globals are available
			'max-nested-callbacks': ['warn', { max: 5 }], // Increased for async patterns
			'max-statements-per-line': ['error', { max: 2 }],
		},
	},
];