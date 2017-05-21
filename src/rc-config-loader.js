// MIT © 2017 azu
// MIT © Zoltan Kochan
// Original https://github.com/zkochan/rcfile
"use strict";
const path = require("path");
const debug = require("debug")("rc-config-loader");
const requireUncached = require("require-uncached");
const JSON5 = require("json5");
const fs = require("fs");
const pathExists = require("path-exists");
const objectAssign = require("object-assign");
const keys = require("object-keys");
const emptyConfig = undefined;

const defaultLoaderByExt = {
    ".js": loadJSConfigFile,
    ".json": loadJSONConfigFile,
    ".yaml": loadYAMLConfigFile,
    ".yml": loadYAMLConfigFile,
};

const defaultOptions = {
    // does look for `package.json`
    packageJSON: false,
    // treat default(no ext file) as some extension
    defaultExtension: ".json",
    cwd: process.cwd()
};

/**
 * @param {string} pkgName
 * @param {rcConfigLoaderOption} [opts]
 * @returns {object}
 */
module.exports = function rcConfigLoader(pkgName, opts = {}) {
    // path/to/config or basename of config file.
    const configFileName = opts.configFileName || `.${pkgName}rc`;
    const defaultExtension = opts.defaultExtension || defaultOptions.defaultExtension;
    const cwd = opts.cwd || defaultOptions.cwd;
    const packageJSON = opts.packageJSON || defaultOptions.packageJSON;
    const packageJSONFieldName = typeof packageJSON === "object"
        ? packageJSON.fieldName
        : pkgName;

    const parts = splitPath(cwd);

    const loaders = Array.isArray(defaultExtension)
        ? defaultExtension.map((extension) => defaultLoaderByExt[extension])
        : defaultLoaderByExt[defaultExtension];

    const loaderByExt = objectAssign({}, defaultLoaderByExt, {
        "": loaders,
    });

    return findConfig(parts);

    /**
     * @returns {object} always return object
     */
    function findConfig() {
        const exts = keys(loaderByExt);
        while (exts.length) {
            const ext = exts.shift();
            const configLocation = join(parts, configFileName + ext);
            if (!pathExists.sync(configLocation)) {
                continue;
            }
            const loaders = loaderByExt[ext];
            if (!Array.isArray(loaders)) {
                const loader = loaders;
                return {
                    config: loader(configLocation),
                    filePath: configLocation
                };
            }
            for (let i = 0; i < loaders.length; i++) {
                const loader = loaders[i];
                const result = loader(configLocation, true);
                if (result) {
                    return {
                        config: result,
                        filePath: configLocation
                    };
                }
            }
        }

        if (packageJSON) {
            const pkgJSONLoc = join(parts, "package.json");
            if (pathExists.sync(pkgJSONLoc)) {
                const pkgJSON = require(pkgJSONLoc);
                if (pkgJSON[packageJSONFieldName]) {
                    return {
                        config: pkgJSON[packageJSONFieldName],
                        filePath: pkgJSONLoc
                    };
                }
            }
        }
        if (parts.pop()) {
            return findConfig();
        }
        return emptyConfig;
    }
};

function splitPath(x) {
    return path.resolve(x || "").split(path.sep);
}

function join(parts, filename) {
    return path.resolve(parts.join(path.sep) + path.sep, filename);
}

function loadJSConfigFile(filePath, suppress) {
    debug(`Loading JS config file: ${filePath}`);
    try {
        return requireUncached(filePath);
    } catch (e) {
        debug(`Error reading JavaScript file: ${filePath}`);
        if (!suppress) {
            e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
            throw e;
        }
    }
}

function loadJSONConfigFile(filePath, suppress) {
    debug(`Loading JSON config file: ${filePath}`);

    try {
        return JSON5.parse(readFile(filePath));
    } catch (e) {
        debug(`Error reading JSON file: ${filePath}`);
        if (!suppress) {
            e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
            throw e;
        }
    }
}

function readFile(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

function loadYAMLConfigFile(filePath, suppress) {
    debug(`Loading YAML config file: ${filePath}`);

    // lazy load YAML to improve performance when not used
    const yaml = require("js-yaml");

    try {
        // empty YAML file can be null, so always use
        return yaml.safeLoad(readFile(filePath)) || {};
    } catch (e) {
        debug(`Error reading YAML file: ${filePath}`);
        if (!suppress) {
            e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
            throw e;
        }
    }
}
