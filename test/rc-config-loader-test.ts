"use strict";
import assert from "assert";
import path from "path";
import { rcFile } from "../src/rc-config-loader";

describe("rc-config-loader", () => {
    it("should read json config in current directory", () => {
        const cwd = path.join(__dirname, "fixtures");
        const results = rcFile("foo", { cwd });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(cwd, ".foorc.json"));
    });

    it("should read json config in parent directory", () => {
        const cwd = path.join(__dirname, "fixtures/some-dir");
        const results = rcFile("foo", { cwd });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(__dirname, "fixtures", ".foorc.json"));
    });

    it("should read json config two directories up", () => {
        const results = rcFile("foo", { cwd: path.join(__dirname, "fixtures/some-dir/some-other-dir") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { foo: 1 });
    });

    it("should read js config in current directory", () => {
        const results = rcFile("bar", { cwd: path.join(__dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { bar: "bar" });
    });

    it("should read js config by { configFileName }", () => {
        const results = rcFile("textlint", { configFileName: path.join(__dirname, "fixtures", ".textlintrc") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, {
            rules: {
                a: true,
                b: true,
                c: true
            }
        });
    });

    it("should read yaml config in current directory", () => {
        const results = rcFile("yamlconfig", { cwd: path.join(__dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { foo: "bar" });
    });

    it("should read from package.json if no separate config file found", () => {
        const results = rcFile("qar", {
            cwd: path.join(__dirname, "fixtures"),
            packageJSON: true
        });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert.deepStrictEqual(config, { qar: "qar" });
        assert.strictEqual(filePath, path.join(__dirname, "fixtures/package.json"));
    });

    it("should read custom filed from package.json", () => {
        const results = rcFile("qar", {
            cwd: path.join(__dirname, "fixtures"),
            packageJSON: {
                fieldName: "custom"
            }
        });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { key: "value" });
    });

    it("should not read from package.json by default", () => {
        const results = rcFile("qar", { cwd: path.join(__dirname, "fixtures") });
        assert.strictEqual(results, undefined);
    });

    it("should search in current directory by default", () => {
        const cwd = path.join(__dirname, "fixtures");
        const results = rcFile<{ extends: string }>("eslint", { cwd });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert(config !== null && config !== undefined);
        assert(config.extends === "standard");
        assert(filePath === path.join(cwd, ".eslintrc"));
    });

    it("should search multiple file type if set multiple extensions to defaultExtension", () => {
        const results = rcFile<{ unknown: string }>("unknown", {
            cwd: path.join(__dirname, "fixtures"),
            defaultExtension: [".json", ".yml", ".js"]
        });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
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
    it("should throw error if config file has invalid content", () => {
        assert.throws(() => {
            rcFile("invalid-config", {
                defaultExtension: ".js",
                cwd: path.join(__dirname, "fixtures")
            });
        }, Error);
    });
    it("should throw error if config file has invalid json", () => {
        assert.throws(() => {
            rcFile("invalidjson", { cwd: path.join(__dirname, "fixtures") });
        }, Error);
    });
});
