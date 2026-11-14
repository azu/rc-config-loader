export type ExtensionName = ".cjs" | ".js" | ".mjs" | ".json" | ".yaml" | ".yml" | ".ts" | ".cts" | ".mts";

export type RequiredOption = "packageJSON" | "cwd";

export type Loader = <R extends {}>(fileName: string, supperes: boolean) => R;

export type ExtensionLoaderMap = Record<ExtensionName, Loader>;

export type PossibleUndefined<T> = T | undefined;

export interface rcConfigResult<R extends Record<string, unknown>> {
    config: R;
    filePath: string;
}

export interface rcConfigLoaderOption {
    /** does look for `package.json` */
    packageJSON?:
        | boolean
        | {
              fieldName: string;
          };

    /** if config file name is not same with packageName, set the name */
    configFileName?: string;

    /** where start to load */
    cwd?: string;

    /**
     * extensions of config files to search, in order of priority.
     * A file without extension like `.<product>rc` is tried as the formats of `.json`, `.yaml`/`.yml`, and `.js` in this list.
     * Default: [".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"]
     */
    extensions?: ExtensionName[];
}

export interface loadConfigFileOption {
    /** the base directory to resolve a relative file path. Default: `process.cwd()` */
    cwd?: string;

    /**
     * extensions of config files to load.
     * A file without a known extension is tried as the formats of `.json`, `.yaml`/`.yml`, and `.js` in this list, in this order.
     * Default: [".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"]
     */
    extensions?: ExtensionName[];
}
