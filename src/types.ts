export type ExtensionName = ".cjs" | ".js" | ".mjs" | ".json" | ".yaml" | ".yml" | ".ts" | ".cts" | ".mts";

export type RequiredOption = "packageJSON" | "defaultExtension" | "cwd";

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

    /** treat default(no ext file) as some extension */
    defaultExtension?: ExtensionName | ExtensionName[];

    /** where start to load */
    cwd?: string;

    /**
     * extensions of config files to search, in order of priority.
     * Default: all supported extensions.
     * If it is specified, the default `defaultExtension` is limited to these extensions.
     */
    extensions?: ExtensionName[];
}

export interface loadConfigFileOption {
    /** the base directory to resolve a relative file path. Default: `process.cwd()` */
    cwd?: string;

    /**
     * extensions of config files to load.
     * Default: all supported extensions.
     * A file without a known extension is tried only as the formats of the allowed `.json`, `.yaml`/`.yml`, and `.js`.
     */
    extensions?: ExtensionName[];
}
