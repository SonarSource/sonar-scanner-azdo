import { defineConfig, globalIgnores } from "eslint/config";
import promise from "eslint-plugin-promise";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";

export default defineConfig([globalIgnores([
    "**/node_modules",
    "**/build",
    "**/coverage",
    "common/ts/helpers/temp-find-method.ts",
]), {
    extends: [js.configs.recommended, promise.configs["flat/recommended"]],

    languageOptions: {
        globals: {
            ...globals.browser,
            ...globals.jest,
            ...globals.node,
        },

        parser: tsParser,
        ecmaVersion: 6,
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                modules: true,
            },
        },
    },

    rules: {
        "for-direction": "error",
        "no-prototype-builtins": "error",
        "no-template-curly-in-string": "error",
        "no-unsafe-negation": "error",
        "array-callback-return": "error",
        "block-scoped-var": "error",
        complexity: "warn",
        "consistent-return": "warn",
        eqeqeq: ["error", "smart"],
        "guard-for-in": "error",
        "no-alert": "error",
        "no-caller": "error",
        "no-eval": "error",
        "no-extend-native": "error",
        "no-extra-bind": "error",
        "no-extra-label": "error",
        "no-floating-decimal": "error",
        "no-implied-eval": "error",
        "no-iterator": "error",
        "no-labels": "error",
        "no-lone-blocks": "error",
        "no-loop-func": "error",
        "no-new": "warn",
        "no-new-func": "error",
        "no-new-wrappers": "error",
        "no-proto": "error",
        "no-restricted-properties": "error",
        "no-return-assign": "error",
        "no-return-await": "error",
        "no-self-compare": "error",
        "no-sequences": "error",
        "no-throw-literal": "warn",
        "no-unmodified-loop-condition": "error",
        "no-unused-expressions": "warn",
        "no-useless-call": "error",
        "no-useless-concat": "warn",
        "no-useless-escape": "warn",
        "no-useless-return": "warn",
        "no-void": "error",
        "no-with": "error",
        radix: "error",
        "require-await": "error",
        "wrap-iife": "error",
        yoda: "warn",
        camelcase: "warn",
        "consistent-this": ["warn", "that"],
        "func-name-matching": "error",

        "func-style": ["warn", "declaration", {
            allowArrowFunctions: true,
        }],

        "max-depth": "warn",
        "max-lines": ["warn", 1000],
        "max-params": ["warn", 4],
        "no-array-constructor": "warn",
        "no-bitwise": "warn",
        "no-lonely-if": "error",
        "no-multi-assign": "warn",
        "no-nested-ternary": "warn",
        "no-new-object": "warn",
        "no-underscore-dangle": "warn",
        "no-unneeded-ternary": "warn",
        "one-var": ["warn", "never"],
        "operator-assignment": "warn",
        "no-duplicate-imports": "error",
        "no-useless-computed-key": "error",
        "no-useless-rename": "error",
        "no-var": "error",
        "object-shorthand": "error",
        "prefer-arrow-callback": "error",
        "prefer-const": "error",

        "prefer-destructuring": ["warn", {
            object: true,
            array: false,
        }],

        "prefer-numeric-literals": "warn",
        "prefer-rest-params": "warn",
        "prefer-spread": "warn",
        "no-undef": "off",
        "no-unused-vars": "off",

        "promise/catch-or-return": ["warn", {
            allowThen: true,
        }],

        "promise/always-return": "off",
        "promise/avoid-new": "off",
    },
}, {
    // Deprecated task versions are frozen until removal, so rules introduced by ESLint 10 are not enforced there.
    files: ["src/common/sonarcloud-v4/**", "src/common/sonarqube-v8/**"],

    rules: {
        "no-useless-assignment": "off",
        "preserve-caught-error": "off",
    },
}]);
