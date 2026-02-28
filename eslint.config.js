const pluginJs = require("@eslint/js");

module.exports = [
    {
        files: ["src/**/*.js", "scripts/**/*.js", "__tests__/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
            globals: {
                __dirname: "readonly",
                process: "readonly",
                console: "readonly",
                module: "readonly",
                require: "readonly",
                Promise: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                Buffer: "readonly",
                jest: "readonly",
                describe: "readonly",
                test: "readonly",
                it: "readonly",
                expect: "readonly",
                beforeAll: "readonly",
                afterAll: "readonly",
                beforeEach: "readonly",
                afterEach: "readonly",
            }
        }
    },
    pluginJs.configs.recommended,
];
