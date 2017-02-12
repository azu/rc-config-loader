"use strict";
const describe = require("mocha").describe;
const it = require("mocha").it;
const assert = require("assert");
const path = require("path");
const rcConfigLoader = require("../src/rc-config-loader");

describe("rc-config-loader", () => {
    it("should read json config in current directory", () => {
        const config = rcConfigLoader("foo", {cwd: path.join(__dirname, "fixtures")});
        assert.deepStrictEqual(config, {foo: 1});
    });

    it("should read json config in parent directory", () => {
        const config = rcConfigLoader("foo", {cwd: path.join(__dirname, "fixtures/some-dir")});
        assert.deepStrictEqual(config, {foo: 1});
    });

    it("should read json config two directories up", () => {
        const config = rcConfigLoader("foo", {cwd: path.join(__dirname, "fixtures/some-dir/some-other-dir")});
        assert.deepStrictEqual(config, {foo: 1});
    });

    it("should read js config in current directory", () => {
        const config = rcConfigLoader("bar", {cwd: path.join(__dirname, "fixtures")});
        assert.deepStrictEqual(config, {bar: "bar"});
    });

    it("should read yaml config in current directory", () => {
        const config = rcConfigLoader("yamlconfig", {cwd: path.join(__dirname, "fixtures")});
        assert.deepStrictEqual(config, {foo: "bar"});
    });

    it("should read from package.json if no separate config file found", () => {
        const config = rcConfigLoader("qar", {cwd: path.join(__dirname, "fixtures")});
        assert.deepStrictEqual(config, {qar: "qar"});
    });

    it("should return empty object if no configuration found", () => {
        const config = rcConfigLoader("qarbar", {cwd: path.join(__dirname, "fixtures")});
        assert.deepStrictEqual(config, {});
    });

    it("should search in current directory by default", () => {
        const config = rcConfigLoader("eslint", {cwd: path.join(__dirname, "fixtures")});
        assert(config !== null && config !== undefined);
        assert(config.extends === "standard");
    });

    it("should search multiple file type if set multiple extensions to defaultExtension", () => {
        const config = rcConfigLoader("unknown", {
            cwd: path.join(__dirname, "fixtures"),
            defaultExtension: [".json", ".yml", ".js"],
        });
        assert(config !== null && config !== undefined);
        assert(config.unknown === "unknown");
    });

    it("should throw error if config file has invalid content", () => {
        assert.throws(() => {
            rcConfigLoader("invalid-config", {
                defaultExtension: ".js",
                cwd: path.join(__dirname, "fixtures"),
            });
        }, Error);
    });
});
