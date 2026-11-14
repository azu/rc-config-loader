// MIT © 2017 azu
// MIT © Zoltan Kochan
// Original https://github.com/zkochan/rcfile
import path from "path";
import fs from "fs";
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
    ".mjs": loadJSConfigFile,
    ".json": loadJSONConfigFile,
    ".yaml": loadYAMLConfigFile,
    ".yml": loadYAMLConfigFile,
    ".ts": loadJSConfigFile,
    ".cts": loadJSConfigFile,
    ".mts": loadJSConfigFile
};

/**
 * Every supported extension. `loadConfigFile` allows them by default.
 */
const supportedExtensions: ExtensionName[] = [".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"];

/**
 * The default extensions to search by `rcFile`, and their priority.
 * `.cjs`, `.mjs`, `.cts`, and `.mts` are searched only when they are given in `extensions`,
 * to keep the number of existence checks small.
 * A file without extension like `.<product>rc` is tried as JSON, YAML, then JavaScript.
 */
const defaultSearchExtensions: ExtensionName[] = [".json", ".yaml", ".yml", ".js", ".ts"];

const defaultOptions: Required<Pick<rcConfigLoaderOption, RequiredOption>> &
    Omit<rcConfigLoaderOption, RequiredOption> = {
    packageJSON: false,
    cwd: process.cwd()
};

const isSupportedExtension = (extension: string): extension is ExtensionName => {
    return Object.prototype.hasOwnProperty.call(defaultLoaderByExt, extension);
};

/**
 * Return the extensions that are allowed to load, in order of priority.
 * If `extensions` is not specified, return the default extensions.
 */
const resolveAllowedExtensions = (
    extensions: ExtensionName[] | undefined,
    defaultExtensions: ExtensionName[]
): ExtensionName[] => {
    if (extensions === undefined) {
        return defaultExtensions;
    }
    if (!Array.isArray(extensions) || extensions.length === 0) {
        throw new Error("extensions should be a non-empty array.");
    }
    extensions.forEach((extension) => {
        if (!isSupportedExtension(extension)) {
            throw new Error(`${extension} is not supported.`);
        }
    });
    return extensions;
};

/**
 * Return the loaders for a file without known extension, in order of `extensions`.
 * - `.json` → JSON, `.yaml` or `.yml` → YAML, `.js` → JavaScript
 * - Other extensions like `.ts` do not add a loader, because a file without extension can not be TypeScript.
 * - The same loader is not added twice, so a JavaScript file is not run twice.
 */
const selectLoadersForNoExtension = (extensions: ExtensionName[]): Loader[] => {
    const loaders: Loader[] = [];
    extensions.forEach((extension) => {
        const loader =
            extension === ".json"
                ? loadJSONConfigFile
                : extension === ".yaml" || extension === ".yml"
                  ? loadYAMLConfigFile
                  : extension === ".js"
                    ? loadJSConfigFile
                    : undefined;
        if (loader && !loaders.includes(loader)) {
            loaders.push(loader);
        }
    });
    return loaders;
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
    if (Object.prototype.hasOwnProperty.call(opts, "defaultExtension")) {
        throw new Error("defaultExtension option is removed. Use extensions option instead.");
    }
    // path/to/config or basename of config file.
    const configFileName = opts.configFileName || `.${pkgName}rc`;
    const allowedExtensions = resolveAllowedExtensions(opts.extensions, defaultSearchExtensions);
    const cwd = opts.cwd || defaultOptions.cwd;
    const packageJSON = opts.packageJSON || defaultOptions.packageJSON;
    const packageJSONFieldName = typeof packageJSON === "object" ? packageJSON.fieldName : pkgName;

    const parts = splitPath(cwd);
    // A file without extension: if only one format is allowed, its error is thrown.
    // If multiple formats are allowed, errors are suppressed and the file is skipped when all fail.
    const noExtensionLoaders = selectLoadersForNoExtension(allowedExtensions);
    const loadersByOrder: Loader | Loader[] =
        noExtensionLoaders.length === 1 ? noExtensionLoaders[0] : noExtensionLoaders;

    // Search the extensions in the order of `extensions`, then the name without extension.
    const loaderByExt: { [index: string]: Loader | Loader[] } = {};
    allowedExtensions.forEach((extension) => {
        loaderByExt[extension] = defaultLoaderByExt[extension];
    });
    if (noExtensionLoaders.length > 0) {
        loaderByExt[""] = loadersByOrder;
    }
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
 *   - `.json` → JSON, `.yaml`/`.yml` → YAML, `.js`/`.cjs`/`.mjs` → JavaScript, `.ts`/`.cts`/`.mts` → TypeScript
 *   - Other names like `.secretlintrc` are tried as JSON, YAML, then JavaScript (in order of `extensions`)
 * - If the file does not exist, throw an Error that has `code: "ENOENT"`
 * - If the file can not be parsed, throw an Error
 * @param {string} filePath
 * @param {loadConfigFileOption} [opts]
 * @returns {{ config: Object, filePath:string }}
 */
export function loadConfigFile<R extends {}>(filePath: string, opts: loadConfigFileOption = {}): rcConfigResult<R> {
    const cwd = opts.cwd || defaultOptions.cwd;
    const allowedExtensions = resolveAllowedExtensions(opts.extensions, supportedExtensions);
    const configLocation = path.resolve(cwd, filePath);
    if (!fs.existsSync(configLocation)) {
        const error: NodeJS.ErrnoException = new Error(`Config file not found: ${configLocation}`);
        error.code = "ENOENT";
        error.path = configLocation;
        throw error;
    }
    const ext = path.extname(configLocation);
    if (isSupportedExtension(ext)) {
        if (!allowedExtensions.includes(ext)) {
            throw createNotAllowedError(configLocation);
        }
        const loader = defaultLoaderByExt[ext];
        return {
            config: loader<R>(configLocation, false),
            filePath: configLocation
        };
    }
    // Unknown or no extension like `.secretlintrc`: try the formats in order of `extensions`.
    // By default, JSON, YAML, then JavaScript.
    // Errors are suppressed except for the last loader, so the error of the last loader is thrown when all fail.
    const fallbackLoaders = selectLoadersForNoExtension(allowedExtensions);
    if (fallbackLoaders.length === 0) {
        throw createNotAllowedError(configLocation);
    }
    for (let i = 0; i < fallbackLoaders.length; i++) {
        const isLast = i === fallbackLoaders.length - 1;
        const result = fallbackLoaders[i]<R>(configLocation, !isLast);
        if (isLast || result !== undefined) {
            return {
                config: result,
                filePath: configLocation
            };
        }
    }
    // unreachable: the last loader returns or throws
    throw createNotAllowedError(configLocation);
}

function createNotAllowedError(configLocation: string): Error {
    const error: NodeJS.ErrnoException = new Error(
        `Config file is not allowed by extensions option: ${configLocation}`
    );
    error.code = "ERR_RC_CONFIG_EXTENSION_NOT_ALLOWED";
    error.path = configLocation;
    return error;
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

/**
 * Load JavaScript or TypeScript config file by Node.js's `require()`.
 * - CommonJS and ES Modules are supported. ES Modules are loaded by `require(esm)`.
 * - TypeScript is supported by Node.js's built-in type stripping.
 */
function loadJSConfigFile(filePath: string, suppress: boolean) {
    debug(`Loading JavaScript config file: ${filePath}`);
    try {
        const resolvedPath = require.resolve(filePath);
        // Remove the cache of CommonJS module to load the latest content.
        // Note: Node.js does not provide a way to remove the cache of ES Modules.
        delete require.cache[resolvedPath];
        try {
            return interopDefault(require(resolvedPath));
        } finally {
            // `require()` adds the loaded module to `module.children`.
            // Remove it so that loading a config file many times does not keep old modules in memory.
            removeChildModule(resolvedPath);
        }
    } catch (error: any) {
        debug(`Error reading JavaScript file: ${filePath}`);
        if (!suppress) {
            error.message = `Cannot read config file: ${filePath}\nError: ${error.message}`;
            throw error;
        }
    }
}

function removeChildModule(resolvedPath: string) {
    const children = module.children;
    for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].id === resolvedPath || children[i].filename === resolvedPath) {
            children.splice(i, 1);
        }
    }
}

/**
 * `require(esm)` returns the module namespace object like `{ __esModule: true, default: config }`.
 * Return the default export as config.
 */
function interopDefault(exported: any) {
    if (exported && exported.__esModule && "default" in exported) {
        return exported.default;
    }
    return exported;
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
