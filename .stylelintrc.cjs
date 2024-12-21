module.exports = {
    extends: ['stylelint-config-standard', 'stylelint-config-recess-order'],
    ignoreFiles: ['**/node_modules/**'],
    rules: {
        'property-no-vendor-prefix': null,
        'comment-empty-line-before': 'always',
        'media-feature-range-notation': 'context',
        'at-rule-empty-line-before': [
            'always',
            {
                except: ['blockless-after-same-name-blockless', 'first-nested'],
                ignore: ['inside-block', 'after-comment'],
            },
        ],
    },
};
