import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules, fixupPluginRules } from "@eslint/compat";
import _import from "eslint-plugin-import";
import promise from "eslint-plugin-promise";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([globalIgnores([
    "**/node_modules",
    "**/build",
    "**/coverage",
    "common/ts/helpers/temp-find-method.ts",
]), {
    extends: fixupConfigRules(
        compat.extends("eslint:recommended", "plugin:import/errors", "plugin:promise/recommended"),
    ),

    plugins: {
        import: fixupPluginRules(_import),
        promise: fixupPluginRules(promise),
    },

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

    settings: {
        "import/ignore": ["node_modules"],
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
        "import/extensions": "error",
        "import/first": "error",
        "import/newline-after-import": "error",
        "import/no-absolute-path": "error",
        "import/no-amd": "error",
        "import/no-deprecated": "error",
        "import/no-duplicates": "error",
        "import/no-dynamic-require": "error",
        "import/no-mutable-exports": "error",
        "import/no-named-as-default": "error",
        "import/no-named-as-default-member": "error",
        "import/no-named-default": "error",
        "import/no-webpack-loader-syntax": "error",
        "import/no-unresolved": "off",

        "promise/catch-or-return": ["warn", {
            allowThen: true,
        }],

        "promise/always-return": "off",
        "promise/avoid-new": "off",
    },
}]);
