import stylistic from "@stylistic/eslint-plugin";
// @ts-expect-error: No types
import pathAlias from "eslint-plugin-path-alias";
// @ts-expect-error: https://github.com/jsx-eslint/eslint-plugin-react/issues/3776
import eslintPluginReact from "eslint-plugin-react";
// @ts-expect-error: No types
import simpleHeader from "eslint-plugin-simple-header";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["browser", "dist", "packages", "src/**/*.?(c|m)js?(x)", "*.*"] },
    {
        files: ["**/*.?(c|m)[jt]s?(x)"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
                warnOnUnsupportedTypeScriptVersion: false
            }
        },
        plugins: {
            // @ts-expect-error: https://github.com/eslint-stylistic/eslint-stylistic/issues/398#issuecomment-2178212946
            "@stylistic": stylistic,
            "@typescript-eslint": tseslint.plugin,
            "path-alias": pathAlias,
            "react": eslintPluginReact,
            "simple-header": simpleHeader,
            "simple-import-sort": simpleImportSort,
            "unused-imports": unusedImports,
        },
        settings: {
            react: { version: "18.2" },
        },
        rules: {
            // Since it's only been a month and Vencord has already been stolen
            // by random skids who rebranded it to "AlphaCord" and erased all license
            // information
            "simple-header/header": ["error", {
                files: ["scripts/header-new.txt", "scripts/header-old.txt"],
                templates: { author: [".*", "Vendicated and contributors"] }
            }],
            "@stylistic/array-bracket-spacing": "error",
            "@stylistic/arrow-parens": ["error", "as-needed"],
            "@stylistic/arrow-spacing": "error",
            "@stylistic/block-spacing": "error",
            "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
            "@stylistic/comma-spacing": "error",
            "@stylistic/comma-style": "error",
            "@stylistic/computed-property-spacing": "error",
            "@stylistic/dot-location": ["error", "property"],
            "@stylistic/eol-last": "error",
            "@stylistic/func-call-spacing": "error",
            "@stylistic/generator-star-spacing": ["error", { before: false, after: true }],
            "@stylistic/indent": ["error", 4, {
                SwitchCase: 1,
                flatTernaryExpressions: true
            }],
            "@stylistic/jsx-closing-bracket-location": "error",
            "@stylistic/jsx-closing-tag-location": "error",
            "@stylistic/jsx-curly-brace-presence": ["error", { propElementValues: "always" }],
            "@stylistic/jsx-curly-spacing": ["error", { children: true }],
            "@stylistic/jsx-equals-spacing": "error",
            "@stylistic/jsx-first-prop-new-line": ["error", "multiline"],
            "@stylistic/jsx-quotes": "error",
            "@stylistic/jsx-self-closing-comp": "error",
            "@stylistic/jsx-tag-spacing": ["error", { beforeClosing: "never" }],
            "@stylistic/jsx-wrap-multilines": ["error", {
                declaration: "parens-new-line",
                assignment: "parens-new-line",
                return: "parens-new-line",
                arrow: "parens-new-line",
                condition: "parens-new-line",
                logical: "parens-new-line",
                propertyValue: "parens-new-line"
            }],
            "@stylistic/key-spacing": "error",
            "@stylistic/keyword-spacing": "error",
            "@stylistic/linebreak-style": "error",
            "@stylistic/member-delimiter-style": ["error", { singleline: { requireLast: true } }],
            "@stylistic/new-parens": "error",
            "@stylistic/no-extra-semi": "error",
            "@stylistic/no-floating-decimal": "error",
            "@stylistic/no-multi-spaces": ["error", { exceptions: { Property: false } }],
            "@stylistic/no-tabs": "error",
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/no-whitespace-before-property": "error",
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/padded-blocks": ["error", "never"],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
            "@stylistic/rest-spread-spacing": "error",
            "@stylistic/semi": "error",
            "@stylistic/semi-spacing": "error",
            "@stylistic/semi-style": "error",
            "@stylistic/space-before-blocks": "error",
            "@stylistic/space-before-function-paren": ["error", { named: "never" }],
            "@stylistic/space-in-parens": "error",
            "@stylistic/space-infix-ops": "error",
            "@stylistic/space-unary-ops": "error",
            "@stylistic/spaced-comment": ["error", "always", { markers: ["!"] }],
            "@stylistic/switch-colon-spacing": "error",
            "@stylistic/template-curly-spacing": "error",
            "@stylistic/template-tag-spacing": "error",
            "@stylistic/type-annotation-spacing": "error",
            "@stylistic/type-generic-spacing": "error",
            "@stylistic/type-named-tuple-spacing": "error",
            "@stylistic/yield-star-spacing": "error",
            "@typescript-eslint/array-type": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/consistent-generic-constructors": "error",
            "@typescript-eslint/consistent-type-assertions": ["error", {
                assertionStyle: "as",
                objectLiteralTypeAssertions: "allow-as-parameter"
            }],
            "@typescript-eslint/consistent-type-exports": ["error", {
                fixMixedExportsWithInlineTypeSpecifier: true
            }],
            "@typescript-eslint/consistent-type-imports": ["error", {
                disallowTypeAnnotations: false,
                fixStyle: "inline-type-imports"
            }],
            "@typescript-eslint/dot-notation": "error",
            "@typescript-eslint/method-signature-style": "error",
            "@typescript-eslint/no-confusing-void-expression": "error",
            "@typescript-eslint/no-duplicate-type-constituents": "error",
            "@typescript-eslint/no-extra-non-null-assertion": "error",
            "@typescript-eslint/no-import-type-side-effects": "error",
            "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
            "@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
            "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
            "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: true }],
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unnecessary-type-parameters": "error",
            "@typescript-eslint/no-unsafe-function-type": "error",
            "@typescript-eslint/no-unused-expressions": ["error", { enforceForJSX: true }],
            "@typescript-eslint/no-wrapper-object-types": "error",
            "@typescript-eslint/non-nullable-type-assertion-style": "error",
            "@typescript-eslint/prefer-as-const": "error",
            "@typescript-eslint/prefer-destructuring": "error",
            "@typescript-eslint/prefer-find": "error",
            "@typescript-eslint/prefer-function-type": "error",
            "@typescript-eslint/prefer-includes": "error",
            "@typescript-eslint/prefer-reduce-type-parameter": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/return-await": "error",
            "eqeqeq": ["error", "always", { null: "ignore" }],
            "for-direction": "error",
            "no-array-constructor": "error",
            "no-async-promise-executor": "error",
            "no-cond-assign": "error",
            "no-dupe-else-if": "error",
            "no-duplicate-case": "error",
            "no-duplicate-imports": "error",
            "no-eval": ["error", { allowIndirect: true }],
            "no-extra-boolean-cast": "error",
            "no-extra-label": "error",
            "no-fallthrough": "error",
            "no-invalid-regexp": "error",
            "no-irregular-whitespace": "error",
            "no-lone-blocks": "error",
            "no-lonely-if": "error",
            "no-loss-of-precision": "error",
            "no-misleading-character-class": "error",
            "no-new-wrappers": "error",
            "no-object-constructor": "error",
            "no-prototype-builtins": "error",
            "no-regex-spaces": "error",
            "no-restricted-globals": ["error", "_", "Diff", "JSX", "React", "ReactDOM"],
            "no-restricted-imports": ["error", {
                patterns: [{
                    regex: "^discord-types(/|$)",
                    message: "Use @vencord/discord-types instead."
                }]
            }],
            "no-restricted-syntax": ["error",
                "SequenceExpression:not(.update):matches(:not(.callee), [expressions.length!=2])",
                "SequenceExpression:not(.update) > :first-child:not(Literal)",
            ],
            "no-shadow-restricted-names": "error",
            "no-undef-init": "error",
            "no-unexpected-multiline": "error",
            "no-unneeded-ternary": ["error", { defaultAssignment: false }],
            "no-unreachable": "error",
            "no-unreachable-loop": "error",
            "no-unused-labels": "error",
            "no-useless-backreference": "error",
            "no-useless-catch": "error",
            "no-useless-computed-key": "error",
            "no-useless-escape": ["error", { extra: "i" }],
            "no-useless-rename": "error",
            "no-void": "error",
            "operator-assignment": "error",
            "path-alias/no-relative": "error",
            "prefer-const": "error",
            "prefer-numeric-literals": "error",
            "prefer-object-spread": "error",
            "prefer-regex-literals": ["error", { disallowRedundantWrapping: true }],
            "prefer-spread": "error",
            "react/forbid-dom-props": ["error", {
                forbid: ["version", "xlinkActuate", "xlinkArcrole", "xlinkHref", "xlinkRole", "xlinkShow", "xlinkTitle", "xlinkType", "xmlBase", "xmlLang", "xmlns", "xmlnsXlink", "xmlSpace"]
            }],
            "react/jsx-fragments": "error",
            "react/jsx-no-useless-fragment": "error",
            "simple-import-sort/exports": "error",
            "simple-import-sort/imports": "error",
            "unused-imports/no-unused-imports": "error",
            "use-isnan": "error",
            "yoda": "error",
        }
    },
);
