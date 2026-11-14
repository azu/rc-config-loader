import assert from "assert";
import path from "path";
import { rcFile } from "../lib/rc-config-loader.js";

describe("rc-config-loader", () => {
    it("should read json config in current directory", () => {
        const cwd = path.join(import.meta.dirname, "fixtures");
        const results = rcFile("foo", { cwd });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(cwd, ".foorc.json"));
    });

    it("should read json config in parent directory", () => {
        const cwd = path.join(import.meta.dirname, "fixtures/some-dir");
        const results = rcFile("foo", { cwd });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert.deepStrictEqual(config, { foo: 1 });
        assert.strictEqual(filePath, path.join(import.meta.dirname, "fixtures", ".foorc.json"));
    });

    it("should read json config two directories up", () => {
        const results = rcFile("foo", { cwd: path.join(import.meta.dirname, "fixtures/some-dir/some-other-dir") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { foo: 1 });
    });

    it("should read js config in current directory", () => {
        const results = rcFile("bar", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { bar: "bar" });
    });

    it("should read cjs config in current directory", () => {
        const results = rcFile("baz", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { baz: "baz" });
    });

    it("should read mjs config in current directory", () => {
        const results = rcFile("mjsrcfile", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        assert.deepStrictEqual(results.config, { type: "rc-mjs" });
        assert.strictEqual(results.filePath, path.join(import.meta.dirname, "fixtures", ".mjsrcfilerc.mjs"));
    });

    it("should read ts config in current directory", () => {
        const results = rcFile("tsrcfile", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        assert.deepStrictEqual(results.config, { type: "rc-ts" });
        assert.strictEqual(results.filePath, path.join(import.meta.dirname, "fixtures", ".tsrcfilerc.ts"));
    });

    it("should read js config by { configFileName }", () => {
        const results = rcFile("textlint", {
            configFileName: path.join(import.meta.dirname, "fixtures", ".textlintrc")
        });
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
        const results = rcFile("yamlconfig", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        const { config } = results;
        assert.deepStrictEqual(config, { foo: "bar" });
    });

    it("should read empty yaml config as empty object", () => {
        const results = rcFile("emptyyaml", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        assert.deepStrictEqual(results.config, {});
    });

    it("should read comment-only yaml config as empty object", () => {
        const results = rcFile("commentyaml", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        assert.deepStrictEqual(results.config, {});
    });

    it("should support merge keys and timestamps in yaml config", () => {
        const results = rcFile("mergeyaml", { cwd: path.join(import.meta.dirname, "fixtures") });
        if (!results) {
            throw new Error("not found");
        }
        assert.deepStrictEqual(results.config, {
            base: { foo: 1 },
            config: { foo: 1, bar: 2 },
            date: new Date(Date.UTC(2020, 0, 1))
        });
    });

    it("should throw error if yaml config has multiple documents", () => {
        assert.throws(() => {
            rcFile("multiyaml", { cwd: path.join(import.meta.dirname, "fixtures") });
        }, /expected a single document/);
    });

    it("should read from package.json if no separate config file found", () => {
        const results = rcFile("qar", {
            cwd: path.join(import.meta.dirname, "fixtures"),
            packageJSON: true
        });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert.deepStrictEqual(config, { qar: "qar" });
        assert.strictEqual(filePath, path.join(import.meta.dirname, "fixtures/package.json"));
    });

    it("should read custom filed from package.json", () => {
        const results = rcFile("qar", {
            cwd: path.join(import.meta.dirname, "fixtures"),
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
        const results = rcFile("qar", { cwd: path.join(import.meta.dirname, "fixtures") });
        assert.strictEqual(results, undefined);
    });

    it("should search in current directory by default", () => {
        const cwd = path.join(import.meta.dirname, "fixtures");
        const results = rcFile<{ extends: string }>("eslint", { cwd });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert(config !== null && config !== undefined);
        assert(config.extends === "standard");
        assert(filePath === path.join(cwd, ".eslintrc"));
    });

    it("should try a file without extension as the formats in extensions", () => {
        const results = rcFile<{ unknown: string }>("unknown", {
            cwd: path.join(import.meta.dirname, "fixtures"),
            extensions: [".json", ".yml", ".js"]
        });
        if (!results) {
            throw new Error("not found");
        }
        const { config, filePath } = results;
        assert(config !== null && config !== undefined);
        assert(config.unknown === "unknown");
        assert(filePath === path.join(import.meta.dirname, "fixtures/.unknownrc"));
    });

    it("should throw error if config file has invalid content", () => {
        assert.throws(() => {
            rcFile("invalid-config", {
                extensions: [".js"],
                cwd: path.join(import.meta.dirname, "fixtures")
            });
        }, Error);
    });
    it("should throw error if config file has invalid content", () => {
        assert.throws(() => {
            rcFile("invalid-config", {
                extensions: [".js"],
                cwd: path.join(import.meta.dirname, "fixtures")
            });
        }, Error);
    });
    it("should throw error if config file has invalid json", () => {
        assert.throws(() => {
            rcFile("invalidjson", { cwd: path.join(import.meta.dirname, "fixtures") });
        }, Error);
    });

    describe("extensions", () => {
        const cwd = path.join(import.meta.dirname, "fixtures/extensions");
        it("should search only the specified extensions", () => {
            const results = rcFile("limit", { cwd, extensions: [".json"] });
            assert.deepStrictEqual(results, { config: { type: "json" }, filePath: path.join(cwd, ".limitrc.json") });
        });
        it("should search the extensions in the specified order", () => {
            const jsFirst = rcFile("limit", { cwd, extensions: [".js", ".json"] });
            assert.strictEqual(jsFirst?.filePath, path.join(cwd, ".limitrc.js"));
            const jsonFirst = rcFile("limit", { cwd, extensions: [".json", ".js"] });
            assert.strictEqual(jsonFirst?.filePath, path.join(cwd, ".limitrc.json"));
        });
        it("should not find a config file of an extension that is not specified", () => {
            assert.strictEqual(rcFile("onlyjs", { cwd, extensions: [".json", ".yaml", ".yml"] }), undefined);
        });
        it("should prefer JSON to JavaScript by default", () => {
            const results = rcFile("priority", { cwd });
            assert.strictEqual(results?.filePath, path.join(cwd, ".priorityrc.json"));
        });
        it("should try a file without extension only as the formats in extensions", () => {
            // .noextrc is JavaScript. Only JSON is tried, so the error of JSON is thrown and it is not run
            const filePath = path.join(cwd, ".noextrc");
            assert.throws(() => rcFile("noext", { cwd, extensions: [".json"] }), {
                message: new RegExp(`^Cannot read config file: ${filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`)
            });
            assert.deepStrictEqual(rcFile("noext", { cwd, extensions: [".json", ".js"] })?.config, {
                type: "no-ext-js"
            });
        });
        it("should not try a file without extension if no format for it is in extensions", () => {
            // .ts does not add a format for a file without extension
            assert.strictEqual(rcFile("noext", { cwd, extensions: [".ts"] }), undefined);
        });
        it("should throw an error if defaultExtension is specified", () => {
            assert.throws(() => rcFile("noext", { cwd, defaultExtension: [".js"] } as any), {
                message: "defaultExtension option is removed. Use extensions option instead."
            });
        });
        it("should throw an error if extensions is empty", () => {
            assert.throws(() => rcFile("limit", { cwd, extensions: [] }), {
                message: "extensions should be a non-empty array."
            });
        });
        it("should throw an error if extensions includes an unsupported extension", () => {
            assert.throws(() => rcFile("limit", { cwd, extensions: [".toml" as any] }), {
                message: ".toml is not supported."
            });
        });
    });
});
