/*
 * Vencord, a Discord client mod
 * Copyright (c) 2023 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import stylistic from "@stylistic/eslint-plugin";
import pathAlias from "eslint-plugin-path-alias";
import react from "eslint-plugin-react";
import header from "eslint-plugin-simple-header";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist", "browser", "packages/vencord-types"] },
    {
        files: ["src/**/*.{tsx,ts,mts,mjs,js,jsx}", "eslint.config.mjs"],
        settings: {
            react: {
                version: "18"
            }
        },
        ...react.configs.flat.recommended,
        rules: {
            ...react.configs.flat.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react/display-name": "off",
            "react/no-unescaped-entities": "off",
        }
    },
    {
        files: ["src/**/*.{tsx,ts,mts,mjs,js,jsx}", "eslint.config.mjs"],
        plugins: {
            "simple-header": header,
            "@stylistic": stylistic,
            "@typescript-eslint": tseslint.plugin,
            "simple-import-sort": simpleImportSort,
            "unused-imports": unusedImports,
            "path-alias": pathAlias
        },
        settings: {
            "import/resolver": {
                map: [
                    ["@webpack", "./src/webpack"],
                    ["@webpack/common", "./src/webpack/common"],
                    ["@utils", "./src/utils"],
                    ["@api", "./src/api"],
                    ["@components", "./src/components"]
                ]
            }
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: ["./tsconfig.json"],
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            /*
             * Since it's only been a month and Vencord has already been stolen
             * by random skids who rebranded it to "AlphaCord" and erased all license
             * information
             */
            "simple-header/header": [
                "error",
                {
                    "files": ["scripts/header-new.txt", "scripts/header-old.txt"],
                    "templates": { "author": [".*", "Vendicated and contributors"] }
                }
            ],

            // Style Rules
            "@stylistic/jsx-quotes": ["error", "prefer-double"],
            "@stylistic/quotes": ["error", "double", { "avoidEscape": true }],
            "@stylistic/no-mixed-spaces-and-tabs": "error",
            "@stylistic/arrow-parens": ["error", "as-needed"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/no-multi-spaces": "error",
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/no-whitespace-before-property": "error",
            "@stylistic/semi": ["error", "always"],
            "@stylistic/semi-style": ["error", "last"],
            "@stylistic/space-in-parens": ["error", "never"],
            "@stylistic/block-spacing": ["error", "always"],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/spaced-comment": ["error", "always", { "markers": ["!"] }],
            "@stylistic/no-extra-semi": "error",

            // TS Rules
            "@stylistic/func-call-spacing": ["error", "never"],

            // ESLint Rules
            "yoda": "error",
            "eqeqeq": ["error", "always", { "null": "ignore" }],
            "prefer-destructuring": ["error", {
                "VariableDeclarator": { "array": false, "object": true },
                "AssignmentExpression": { "array": false, "object": false }
            }],
            "operator-assignment": ["error", "always"],
            "no-useless-computed-key": "error",
            "no-unneeded-ternary": ["error", { "defaultAssignment": false }],
            "no-invalid-regexp": "error",
            "no-constant-condition": ["error", { "checkLoops": false }],
            "no-duplicate-imports": "error",
            "@typescript-eslint/dot-notation": [
                "error",
                {
                    "allowPrivateClassPropertyAccess": true,
                    "allowProtectedClassPropertyAccess": true
                }
            ],
            "no-useless-escape": [
                "error",
                {
                    "extra": "i"
                }
            ],
            "no-fallthrough": "error",
            "for-direction": "error",
            "no-async-promise-executor": "error",
            "no-cond-assign": "error",
            "no-dupe-else-if": "error",
            "no-duplicate-case": "error",
            "no-irregular-whitespace": "error",
            "no-loss-of-precision": "error",
            "no-misleading-character-class": "error",
            "no-prototype-builtins": "error",
            "no-regex-spaces": "error",
            "no-shadow-restricted-names": "error",
            "no-unexpected-multiline": "error",
            "no-unsafe-optional-chaining": "error",
            "no-useless-backreference": "error",
            "use-isnan": "error",
            "prefer-const": ["error", { destructuring: "all" }],
            "prefer-spread": "error",

            // Plugin Rules
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "unused-imports/no-unused-imports": "error",
            "path-alias/no-relative": "error"
        }
    }
);
