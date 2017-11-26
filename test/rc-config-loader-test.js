"use strict";
const describe = require("mocha").describe;
const it = require("mocha").it;
const assert = require("assert");
const path = require("path");
const rcConfigLoader = require("../src/rc-config-loader");

describe("rc-config-loader", () => {
    it("should read json config in current directory", () => {
        const cwd = path.join(__dirname, "fixtures");
        const { config, filePath } = rcConfigLoader("foo", { cwd });
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(cwd, ".foorc.json"));
    });

    it("should read json config in parent directory", () => {
        const cwd = path.join(__dirname, "fixtures/some-dir");
        const { config, filePath } = rcConfigLoader("foo", { cwd });
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(__dirname, "fixtures", ".foorc.json"));
    });

    it("should read json config two directories up", () => {
        const { config } = rcConfigLoader("foo", { cwd: path.join(__dirname, "fixtures/some-dir/some-other-dir") });
        assert.deepStrictEqual(config, { foo: 1 });
    });

    it("should read js config in current directory", () => {
        const { config } = rcConfigLoader("bar", { cwd: path.join(__dirname, "fixtures") });
        assert.deepStrictEqual(config, { bar: "bar" });
    });

    it("should read js config by { configFileName }", () => {
        const { config } = rcConfigLoader("textlint", {
            configFileName: path.join(__dirname, "fixtures", ".textlintrc")
        });
        assert.deepStrictEqual(config, {
            rules: {
                a: true,
                b: true,
                c: true
            }
        });
    });

    it("should read yaml config in current directory", () => {
        const { config } = rcConfigLoader("yamlconfig", { cwd: path.join(__dirname, "fixtures") });
        assert.deepStrictEqual(config, { foo: "bar" });
    });

    it("should read from package.json if no separate config file found", () => {
        const { config } = rcConfigLoader("qar", {
            cwd: path.join(__dirname, "fixtures"),
            packageJSON: true
        });
        assert.deepStrictEqual(config, { qar: "qar" });
    });

    it("should read custom filed from package.json", () => {
        const { config } = rcConfigLoader("qar", {
            cwd: path.join(__dirname, "fixtures"),
            packageJSON: {
                fieldName: "custom"
            }
        });
        assert.deepStrictEqual(config, { key: "value" });
    });

    it("should not read from package.json by default", () => {
        const result = rcConfigLoader("qar", { cwd: path.join(__dirname, "fixtures") });
        assert.deepStrictEqual(result, undefined);
    });

    it("should return empty object if no configuration found", () => {
        const result = rcConfigLoader("qarbar", { cwd: path.join(__dirname, "fixtures") });
        assert.deepStrictEqual(result, undefined);
    });

    it("should search in current directory by default", () => {
        const cwd = path.join(__dirname, "fixtures");
        const { config, filePath } = rcConfigLoader("eslint", { cwd });
        assert(config !== null && config !== undefined);
        assert(config.extends === "standard");
        assert(filePath === path.join(cwd, ".eslintrc"));
    });

    it("should search multiple file type if set multiple extensions to defaultExtension", () => {
        const { config, filePath } = rcConfigLoader("unknown", {
            cwd: path.join(__dirname, "fixtures"),
            defaultExtension: [".json", ".yml", ".js"]
        });
        assert(config !== null && config !== undefined);
        assert(config.unknown === "unknown");
        assert(filePath === path.join(__dirname, "fixtures/.unknownrc"));
    });

    it("should throw error if config file has invalid content", () => {
        assert.throws(() => {
            rcConfigLoader("invalid-config", {
                defaultExtension: ".js",
                cwd: path.join(__dirname, "fixtures")
            });
        }, Error);
    });
});
