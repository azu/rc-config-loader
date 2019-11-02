"use strict";
import assert from "assert";
import path from "path";
import { rcFile } from "../src/rc-config-loader";

describe("rc-config-loader", () => {
    it("should read json config in current directory", () => {
        const cwd = path.join(__dirname, "fixtures");
        const { config, filePath } = rcFile("foo", { cwd });
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(cwd, ".foorc.json"));
    });

    it("should read json config in parent directory", () => {
        const cwd = path.join(__dirname, "fixtures/some-dir");
        const { config, filePath } = rcFile("foo", { cwd });
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(__dirname, "fixtures", ".foorc.json"));
    });

    it("should read json config two directories up", () => {
        const { config } = rcFile("foo", { cwd: path.join(__dirname, "fixtures/some-dir/some-other-dir") });
        assert.deepStrictEqual(config, { foo: 1 });
    });

    it("should read js config in current directory", () => {
        const { config } = rcFile("bar", { cwd: path.join(__dirname, "fixtures") });
        assert.deepStrictEqual(config, { bar: "bar" });
    });

    it("should read js config by { configFileName }", () => {
        const { config } = rcFile("textlint", {
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
        const { config } = rcFile("yamlconfig", { cwd: path.join(__dirname, "fixtures") });
        assert.deepStrictEqual(config, { foo: "bar" });
    });

    it("should read from package.json if no separate config file found", () => {
        const { config, filePath } = rcFile("qar", {
            cwd: path.join(__dirname, "fixtures"),
            packageJSON: true
        });
        assert.deepStrictEqual(config, { qar: "qar" });
        assert.strictEqual(filePath, path.join(__dirname, "fixtures/package.json"));
    });

    it("should read custom filed from package.json", () => {
        const { config } = rcFile("qar", {
            cwd: path.join(__dirname, "fixtures"),
            packageJSON: {
                fieldName: "custom"
            }
        });
        assert.deepStrictEqual(config, { key: "value" });
    });

    it("should not read from package.json by default", () => {
        assert.throws(() => {
            rcFile("qar", { cwd: path.join(__dirname, "fixtures") });
        }, Error);
    });

    it("should search in current directory by default", () => {
        const cwd = path.join(__dirname, "fixtures");
        const { config, filePath } = rcFile("eslint", { cwd });
        assert(config !== null && config !== undefined);
        assert(config.extends === "standard");
        assert(filePath === path.join(cwd, ".eslintrc"));
    });

    it("should search multiple file type if set multiple extensions to defaultExtension", () => {
        const { config, filePath } = rcFile("unknown", {
            cwd: path.join(__dirname, "fixtures"),
            defaultExtension: [".json", ".yml", ".js"]
        });
        assert(config !== null && config !== undefined);
        assert(config.unknown === "unknown");
        assert(filePath === path.join(__dirname, "fixtures/.unknownrc"));
    });

    it("should throw error if config file has invalid content", () => {
        assert.throws(() => {
            rcFile("invalid-config", {
                defaultExtension: ".js",
                cwd: path.join(__dirname, "fixtures")
            });
        }, Error);
    });
});
