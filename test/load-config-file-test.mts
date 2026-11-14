import assert from "assert";
import fs from "fs";
import os from "os";
import { createRequire } from "module";
import path from "path";
import { loadConfigFile } from "../lib/rc-config-loader.js";

const fixturesDir = path.join(import.meta.dirname, "fixtures/load-config-file");

const assertNotFound = (fn: () => unknown, filePath: string) => {
    assert.throws(fn, (error: NodeJS.ErrnoException) => {
        assert.strictEqual(error.code, "ENOENT");
        assert.strictEqual(error.path, filePath);
        return true;
    });
};

describe("loadConfigFile", () => {
    describe("loader by extension", () => {
        const cases: Array<[string, string]> = [
            ["rc.json", "json"],
            ["rc.yaml", "yaml"],
            ["rc.yml", "yml"],
            ["rc.js", "js"],
            ["rc.cjs", "cjs"],
            ["rc.mjs", "mjs"],
            ["esm.js", "esm-js"],
            ["rc.ts", "ts"],
            ["rc.cts", "cts"]
        ];
        cases.forEach(([fileName, type]) => {
            it(`should load ${fileName}`, () => {
                const { config, filePath } = loadConfigFile(fileName, { cwd: fixturesDir });
                assert.deepStrictEqual(config, { type });
                assert.strictEqual(filePath, path.join(fixturesDir, fileName));
            });
        });
    });

    describe("ES Modules and TypeScript", () => {
        it("should load .mts that imports other module", () => {
            const { config } = loadConfigFile("rc.mts", { cwd: fixturesDir });
            assert.deepStrictEqual(config, { type: "mts", shared: 42 });
        });
        it("should throw an error if ES Module uses top-level await", () => {
            const filePath = path.join(fixturesDir, "top-level-await.mjs");
            assert.throws(() => loadConfigFile("top-level-await.mjs", { cwd: fixturesDir }), {
                code: "ERR_REQUIRE_ASYNC_MODULE",
                message: new RegExp(`^Cannot read config file: ${escapeRegExp(filePath)}`)
            });
        });
        it("should throw an error if TypeScript uses syntax that requires transformation", () => {
            const filePath = path.join(fixturesDir, "enum.ts");
            assert.throws(() => loadConfigFile("enum.ts", { cwd: fixturesDir }), {
                code: "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX",
                message: new RegExp(`^Cannot read config file: ${escapeRegExp(filePath)}`)
            });
        });
        it("should load the latest content of CommonJS config file", () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-config-loader-"));
            try {
                const filePath = path.join(tmpDir, "rc.cjs");
                fs.writeFileSync(filePath, "module.exports = { version: 1 };");
                assert.deepStrictEqual(loadConfigFile(filePath).config, { version: 1 });
                fs.writeFileSync(filePath, "module.exports = { version: 2 };");
                assert.deepStrictEqual(loadConfigFile(filePath).config, { version: 2 });
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
        it("should not keep loaded config modules in module.children", () => {
            const require = createRequire(import.meta.url);
            const libModule = require.cache[require.resolve("../lib/rc-config-loader.js")];
            assert.ok(libModule);
            const filePaths = ["rc.cjs", "rc.mjs", "rc.ts"].map((fileName) => path.join(fixturesDir, fileName));
            for (let i = 0; i < 3; i++) {
                filePaths.forEach((filePath) => loadConfigFile(filePath));
            }
            const childIds = libModule.children.map((child) => child.id);
            filePaths.forEach((filePath) => {
                assert.ok(!childIds.includes(filePath), `${filePath} should not be in module.children`);
            });
        });
    });

    describe("file without known extension", () => {
        it("should load it as JSON", () => {
            const { config } = loadConfigFile(".jsonrc", { cwd: fixturesDir });
            assert.deepStrictEqual(config, { type: "no-ext-json" });
        });
        it("should load it as YAML", () => {
            const { config } = loadConfigFile(".yamlrc", { cwd: fixturesDir });
            assert.deepStrictEqual(config, { type: "no-ext-yaml", list: ["a"] });
        });
        it("should load it as JavaScript", () => {
            const { config } = loadConfigFile(".jsrc", { cwd: fixturesDir });
            assert.deepStrictEqual(config, { type: "no-ext-js" });
        });
        it("should throw an error if it can not be loaded by any loader", () => {
            const filePath = path.join(fixturesDir, ".invalidrc");
            assert.throws(() => loadConfigFile(".invalidrc", { cwd: fixturesDir }), {
                message: new RegExp(`^Cannot read config file: ${escapeRegExp(filePath)}`)
            });
        });
    });

    describe("path resolution", () => {
        it("should accept an absolute path", () => {
            const absolutePath = path.join(fixturesDir, "rc.json");
            const { config, filePath } = loadConfigFile(absolutePath, { cwd: path.join(fixturesDir, "sub") });
            assert.deepStrictEqual(config, { type: "json" });
            assert.strictEqual(filePath, absolutePath);
        });
        it("should resolve a relative path from cwd", () => {
            const { config, filePath } = loadConfigFile("sub/sub.json", { cwd: fixturesDir });
            assert.deepStrictEqual(config, { type: "sub" });
            assert.strictEqual(filePath, path.join(fixturesDir, "sub/sub.json"));
        });
        it("should resolve a relative path from process.cwd() by default", () => {
            const relativePath = path.relative(process.cwd(), path.join(fixturesDir, "rc.json"));
            const { config, filePath } = loadConfigFile(relativePath);
            assert.deepStrictEqual(config, { type: "json" });
            assert.strictEqual(filePath, path.join(fixturesDir, "rc.json"));
        });
    });

    describe("no search", () => {
        it("should not search parent directories", () => {
            // fixtures/load-config-file/rc.json exists, but fixtures/load-config-file/sub/rc.json does not
            const cwd = path.join(fixturesDir, "sub");
            assertNotFound(() => loadConfigFile("rc.json", { cwd }), path.join(cwd, "rc.json"));
        });
        it("should not append any extension", () => {
            // rc.json exists, but rc does not
            assertNotFound(() => loadConfigFile("rc", { cwd: fixturesDir }), path.join(fixturesDir, "rc"));
        });
    });

    describe("error", () => {
        it("should throw an error with ENOENT code if the file is not found", () => {
            assertNotFound(
                () => loadConfigFile("not-found.json", { cwd: fixturesDir }),
                path.join(fixturesDir, "not-found.json")
            );
        });
        it("should throw an error if the file can not be parsed", () => {
            const filePath = path.join(fixturesDir, "invalid.json");
            assert.throws(() => loadConfigFile("invalid.json", { cwd: fixturesDir }), {
                message: new RegExp(`^Cannot read config file: ${escapeRegExp(filePath)}`)
            });
        });
    });

    describe("extensions", () => {
        const assertNotAllowed = (fn: () => unknown, filePath: string) => {
            assert.throws(fn, (error: NodeJS.ErrnoException) => {
                assert.strictEqual(error.code, "ERR_RC_CONFIG_EXTENSION_NOT_ALLOWED");
                assert.strictEqual(error.path, filePath);
                return true;
            });
        };
        it("should load a file of a specified extension", () => {
            const { config } = loadConfigFile("rc.json", { cwd: fixturesDir, extensions: [".json"] });
            assert.deepStrictEqual(config, { type: "json" });
        });
        it("should not load a file of an extension that is not specified", () => {
            assertNotAllowed(
                () => loadConfigFile("rc.js", { cwd: fixturesDir, extensions: [".json", ".yaml"] }),
                path.join(fixturesDir, "rc.js")
            );
        });
        it("should not try a file without extension as JavaScript if .js is not specified", () => {
            const filePath = path.join(fixturesDir, ".jsrc");
            assert.throws(() => loadConfigFile(".jsrc", { cwd: fixturesDir, extensions: [".json"] }), {
                message: new RegExp(`^Cannot read config file: ${escapeRegExp(filePath)}`)
            });
        });
        it("should try a file without extension as the specified formats", () => {
            const { config } = loadConfigFile(".yamlrc", { cwd: fixturesDir, extensions: [".yml"] });
            assert.deepStrictEqual(config, { type: "no-ext-yaml", list: ["a"] });
        });
        it("should throw an error if no format is allowed for a file without extension", () => {
            assertNotAllowed(
                () => loadConfigFile(".jsonrc", { cwd: fixturesDir, extensions: [".ts"] }),
                path.join(fixturesDir, ".jsonrc")
            );
        });
        it("should throw an error if extensions is empty", () => {
            assert.throws(() => loadConfigFile("rc.json", { cwd: fixturesDir, extensions: [] }), {
                message: "extensions should be a non-empty array."
            });
        });
    });
});

function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
