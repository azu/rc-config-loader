// MIT © 2017 azu
// MIT © Zoltan Kochan
// Original https://github.com/zkochan/rcfile
import path from "path";
import fs from "fs";
import requireFromString from "require-from-string";
import JSON5 from "json5";
import type {
    PossibleUndefined,
    rcConfigLoaderOption,
    rcConfigResult,
    loadConfigFileOption,
    RequiredOption,
    ExtensionName,
    ExtensionLoaderMap,
    Loader
} from "./types";

const debug = require("debug")("rc-config-loader");

const defaultLoaderByExt: ExtensionLoaderMap = {
    ".cjs": loadJSConfigFile,
    ".js": loadJSConfigFile,
    ".json": loadJSONConfigFile,
    ".yaml": loadYAMLConfigFile,
    ".yml": loadYAMLConfigFile
};

const defaultOptions: Required<Pick<rcConfigLoaderOption, RequiredOption>> &
    Omit<rcConfigLoaderOption, RequiredOption> = {
    packageJSON: false,
    defaultExtension: [".json", ".yaml", ".yml", ".js", ".cjs"],
    cwd: process.cwd()
};

const selectLoader = (defaultLoaderByExt: ExtensionLoaderMap, extension: ExtensionName): Loader => {
    if (!defaultOptions.defaultExtension.includes(extension)) {
        throw new Error(`${extension} is not supported.`);
    }
    return defaultLoaderByExt[extension];
};

/**
 * Find and load rcfile, return { config, filePath }
 * If not found any rcfile, throw an Error.
 * @param {string} pkgName
 * @param {rcConfigLoaderOption} [opts]
 * @returns {{ config: Object, filePath:string } | undefined}
 */
export function rcFile<R extends {}>(
    pkgName: string,
    opts: rcConfigLoaderOption = {}
): PossibleUndefined<rcConfigResult<R>> {
    // path/to/config or basename of config file.
    const configFileName = opts.configFileName || `.${pkgName}rc`;
    const defaultExtension = opts.defaultExtension || defaultOptions.defaultExtension;
    const cwd = opts.cwd || defaultOptions.cwd;
    const packageJSON = opts.packageJSON || defaultOptions.packageJSON;
    const packageJSONFieldName = typeof packageJSON === "object" ? packageJSON.fieldName : pkgName;

    const parts = splitPath(cwd);
    const loadersByOrder = Array.isArray(defaultExtension)
        ? defaultExtension.map((extension) => selectLoader(defaultLoaderByExt, extension))
        : selectLoader(defaultLoaderByExt, defaultExtension);

    const loaderByExt = {
        ...defaultLoaderByExt,
        "": loadersByOrder
    };
    return findConfig<R>({
        parts,
        loaderByExt,
        loadersByOrder,
        configFileName,
        packageJSON,
        packageJSONFieldName
    });
}

/**
 * Load exactly one config file, return { config, filePath }
 * - `filePath` is resolved from `opts.cwd`(default: `process.cwd()`)
 * - It does not search parent directories, does not append any extension, and does not read `package.json`
 * - The loader is selected by the extension of `filePath`
 *   - `.json` → JSON, `.yaml`/`.yml` → YAML, `.js`/`.cjs` → JavaScript
 *   - Other names like `.secretlintrc` are tried as JSON, YAML, then JavaScript
 * - If the file does not exist, throw an Error that has `code: "ENOENT"`
 * - If the file can not be parsed, throw an Error
 * @param {string} filePath
 * @param {loadConfigFileOption} [opts]
 * @returns {{ config: Object, filePath:string }}
 */
export function loadConfigFile<R extends {}>(filePath: string, opts: loadConfigFileOption = {}): rcConfigResult<R> {
    const cwd = opts.cwd || defaultOptions.cwd;
    const configLocation = path.resolve(cwd, filePath);
    if (!fs.existsSync(configLocation)) {
        const error: NodeJS.ErrnoException = new Error(`Config file not found: ${configLocation}`);
        error.code = "ENOENT";
        error.path = configLocation;
        throw error;
    }
    const ext = path.extname(configLocation);
    if (Object.prototype.hasOwnProperty.call(defaultLoaderByExt, ext)) {
        const loader = defaultLoaderByExt[ext as ExtensionName];
        return {
            config: loader<R>(configLocation, false),
            filePath: configLocation
        };
    }
    // Unknown or no extension like `.secretlintrc`: try JSON, YAML, then JavaScript.
    // Errors are suppressed except for the last loader, so the error of JavaScript loader is thrown when all fail.
    const fallbackLoaders: Loader[] = [loadJSONConfigFile, loadYAMLConfigFile];
    for (const loader of fallbackLoaders) {
        const result = loader<R>(configLocation, true);
        if (result !== undefined) {
            return {
                config: result,
                filePath: configLocation
            };
        }
    }
    return {
        config: loadJSConfigFile(configLocation, false),
        filePath: configLocation
    };
}

/**
 *
 * @returns {{
 *  config: string,
 *  filePath: string
 * }}
 */
function findConfig<R extends {}>({
    parts,
    loaderByExt,
    loadersByOrder,
    configFileName,
    packageJSON,
    packageJSONFieldName
}: {
    parts: string[];
    loaderByExt: {
        [index: string]: Loader | Loader[];
    };
    loadersByOrder: Loader | Loader[];
    configFileName: string;
    packageJSON: boolean | { fieldName: string };
    packageJSONFieldName: string;
}):
    | {
          config: R;
          filePath: string;
      }
    | undefined {
    const extensions = Object.keys(loaderByExt);
    while (extensions.length) {
        const ext = extensions.shift();
        // may be ext is "". if it .<product>rc
        const configLocation = join(parts, configFileName + ext);
        if (!fs.existsSync(configLocation)) {
            continue;
        }
        // if ext === ""(empty string):, use ordered loaders
        const loaders = ext ? loaderByExt[ext] : loadersByOrder;
        if (!Array.isArray(loaders)) {
            const loader = loaders;
            const result = loader<R>(configLocation, false);
            if (!result) {
                continue;
            }
            return {
                config: result,
                filePath: configLocation
            };
        }
        for (let i = 0; i < loaders.length; i++) {
            const loader = loaders[i];
            const result = loader<R>(configLocation, true);
            if (!result) {
                continue;
            }
            return {
                config: result,
                filePath: configLocation
            };
        }
    }

    if (packageJSON) {
        const pkgJSONLoc = join(parts, "package.json");
        if (fs.existsSync(pkgJSONLoc)) {
            const pkgJSON = JSON5.parse(readFile(pkgJSONLoc));
            if (pkgJSON[packageJSONFieldName]) {
                return {
                    config: pkgJSON[packageJSONFieldName],
                    filePath: pkgJSONLoc
                };
            }
        }
    }
    if (parts.pop()) {
        return findConfig({ parts, loaderByExt, loadersByOrder, configFileName, packageJSON, packageJSONFieldName });
    }
    return;
}

function splitPath(x: string): string[] {
    return path.resolve(x || "").split(path.sep);
}

function join(parts: string[], filename: string) {
    return path.resolve(parts.join(path.sep) + path.sep, filename);
}

function loadJSConfigFile(filePath: string, suppress: boolean) {
    debug(`Loading JavaScript config file: ${filePath}`);
    try {
        const content = fs.readFileSync(filePath, "utf-8");
        return requireFromString(content, filePath);
    } catch (error: any) {
        debug(`Error reading JavaScript file: ${filePath}`);
        if (!suppress) {
            error.message = `Cannot read config file: ${filePath}\nError: ${error.message}`;
            throw error;
        }
    }
}

function loadJSONConfigFile(filePath: string, suppress: boolean) {
    debug(`Loading JSON config file: ${filePath}`);

    try {
        return JSON5.parse(readFile(filePath));
    } catch (error: any) {
        debug(`Error reading JSON file: ${filePath}`);
        if (!suppress) {
            error.message = `Cannot read config file: ${filePath}\nError: ${error.message}`;
            throw error;
        }
    }
}

function readFile(filePath: string) {
    return fs.readFileSync(filePath, "utf8");
}

function loadYAMLConfigFile(filePath: string, suppress: boolean) {
    debug(`Loading YAML config file: ${filePath}`);
    // lazy load YAML to improve performance when not used
    const { load, loadAll, CORE_SCHEMA, mergeTag, timestampTag } = require("js-yaml");
    // js-yaml v5 uses YAML 1.2 CORE_SCHEMA by default.
    // Add `<<` merge keys and timestamps back to keep the same behavior as js-yaml v4's DEFAULT_SCHEMA
    const schema = CORE_SCHEMA.withTags(mergeTag, timestampTag);
    try {
        const content = readFile(filePath);
        // js-yaml v5's load() throws on empty input(empty, whitespace-only or comment-only file),
        // but loadAll() returns an empty array for it. Treat it as an empty config.
        // Use loadAll() to parse the content only once.
        const documents = loadAll(content, { schema });
        if (documents.length === 0) {
            return {};
        }
        if (documents.length > 1) {
            // throw the same error as load() for multiple documents
            return load(content, { schema });
        }
        // empty document like "---" is null, so always use object
        return documents[0] || {};
    } catch (error: any) {
        debug(`Error reading YAML file: ${filePath}`);
        if (!suppress) {
            error.message = `Cannot read config file: ${filePath}\nError: ${error.message}`;
            throw error;
        }
    }
}
