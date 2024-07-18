import stylistic from "@stylistic/eslint-plugin";
// @ts-expect-error: No types
import pathAlias from "eslint-plugin-path-alias";
// @ts-expect-error: No types
import simpleHeader from "eslint-plugin-simple-header";
import simpleImportSort from "eslint-plugin-simple-import-sort";
// @ts-expect-error: No types
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["browser", "dist", "packages", "src/**/*.?(c|m)js?(x)", "eslint.config.mjs"] },
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
            "simple-header": simpleHeader,
            "simple-import-sort": simpleImportSort,
            "unused-imports": unusedImports,
        },
        rules: {
            // Since it's only been a month and Vencord has already been stolen
            // by random skids who rebranded it to "AlphaCord" and erased all license
            // information
            "simple-header/header": ["error", {
                files: ["scripts/header-new.txt", "scripts/header-old.txt"],
                templates: { author: [".*", "Vendicated and contributors"] }
            }],
            "@stylistic/arrow-parens": ["error", "as-needed"],
            "@stylistic/block-spacing": "error",
            "@stylistic/eol-last": "error",
            "@stylistic/func-call-spacing": "error",
            "@stylistic/indent": ["error", 4, {
                // Allow both flat and indented ternary expressions
                ignoredNodes: [".consequent, .alternate, .trueType, .falseType"],
                SwitchCase: 1
            }],
            "@stylistic/jsx-quotes": "error",
            "@stylistic/linebreak-style": "error",
            "@stylistic/member-delimiter-style": ["error", { singleline: { requireLast: true } }],
            "@stylistic/no-extra-semi": "error",
            "@stylistic/no-mixed-spaces-and-tabs": "error",
            "@stylistic/no-multi-spaces": "error",
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/no-whitespace-before-property": "error",
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
            "@stylistic/semi": "error",
            "@stylistic/semi-spacing": "error",
            "@stylistic/semi-style": "error",
            "@stylistic/space-before-function-paren": ["error", { named: "never" }],
            "@stylistic/space-in-parens": "error",
            "@stylistic/spaced-comment": ["error", "always", { markers: ["!"] }],
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
            "@typescript-eslint/no-unnecessary-condition": "error",
            "@typescript-eslint/no-unnecessary-type-assertion": "error",
            "@typescript-eslint/no-unsafe-function-type": "error",
            "@typescript-eslint/no-unused-expressions": "error",
            "@typescript-eslint/no-wrapper-object-types": "error",
            "@typescript-eslint/non-nullable-type-assertion-style": "error",
            "@typescript-eslint/prefer-as-const": "error",
            "@typescript-eslint/prefer-destructuring": "error",
            "@typescript-eslint/prefer-find": "error",
            "@typescript-eslint/prefer-function-type": "error",
            "@typescript-eslint/prefer-includes": "error",
            "@typescript-eslint/require-await": "error",
            "@typescript-eslint/return-await": "error",
            "eqeqeq": ["error", "always", { null: "ignore" }],
            "for-direction": "error",
            "no-async-promise-executor": "error",
            "no-cond-assign": "error",
            "no-constant-condition": ["error", { checkLoops: "none" }],
            "no-dupe-else-if": "error",
            "no-duplicate-case": "error",
            "no-duplicate-imports": "error",
            "no-eval": ["error", { allowIndirect: true }],
            "no-fallthrough": "error",
            "no-invalid-regexp": "error",
            "no-irregular-whitespace": "error",
            "no-loss-of-precision": "error",
            "no-misleading-character-class": "error",
            "no-prototype-builtins": "error",
            "no-regex-spaces": "error",
            "no-restricted-globals": ["error", "_", "Diff", "JSX", "React", "ReactDOM"],
            "no-restricted-imports": ["error", {
                patterns: [{
                    regex: "^discord-types(/|$)",
                    message: "Use @vencord/discord-types instead."
                }]
            }],
            "no-restricted-syntax": ["error", "[operator=void]"],
            "no-shadow-restricted-names": "error",
            "no-unexpected-multiline": "error",
            "no-unneeded-ternary": ["error", { defaultAssignment: false }],
            "no-unsafe-optional-chaining": "error",
            "no-useless-backreference": "error",
            "no-useless-computed-key": "error",
            "no-useless-escape": ["error", { extra: "i" }],
            "operator-assignment": "error",
            "path-alias/no-relative": "error",
            "prefer-const": "error",
            "prefer-object-spread": "error",
            "prefer-spread": "error",
            "simple-import-sort/exports": "error",
            "simple-import-sort/imports": "error",
            "unused-imports/no-unused-imports": "error",
            "use-isnan": "error",
            "yoda": "error",
        }
    },
);
