# Design of specified configuration file loading

[日本語](design.ja.md)

## About this document

This document describes how the [Requirements of specified configuration file loading](requirements.md) are implemented with `loadConfigFile`.
The parent Product is [rc-config-loader](../../product.md).

### Audience

People and agents who change `loadConfigFile`.

### Prerequisites

[Configuration file formats](../config-formats/requirements.md). The loader of each format throws an error when it cannot read the file if `suppress` is `false`, and returns `undefined` if `suppress` is `true`.

### Out of scope

The implementation of the loader of each format is described in the design of the configuration file formats feature.

## Implementation approach

`loadConfigFile` is in `src/rc-config-loader.ts`, and reads one file without using `findConfig` of the search.
The loaders of each format, and the table from extensions to loaders `defaultLoaderByExt`, are shared with `rcFile`.

1. `resolveAllowedExtensions` decides the extensions allowed to load (`allowedExtensions`). By default, every extension in the table (`supportedExtensions`), unlike the default of `rcFile`. Invalid values are handled in the same way as `rcFile`.
2. The path is made absolute with `path.resolve(cwd, filePath)`. The default `cwd` is `process.cwd()`.
3. When `fs.existsSync` does not find the file, an error with `code = "ENOENT"` and `path` is thrown. The `code` is the same as file operation errors of Node.js, so that a caller can tell whether the file exists by `code`.
4. When the extension from `path.extname` is in `defaultLoaderByExt`, it is checked against `allowedExtensions`. When it is not included, `createNotAllowedError` throws an error with `code = "ERR_RC_CONFIG_EXTENSION_NOT_ALLOWED"` and `path`. When it is included, that loader is called with `suppress = false`, and its result is returned.
5. When the extension is not in the table, or there is no extension, an array of loaders to try is built: with `selectLoadersForNoExtension`, the same as `rcFile`: in the order of `allowedExtensions`, the JSON loader for `.json`, the YAML loader for `.yaml` or `.yml`, and the JavaScript loader for `.js`. When the array is empty, the same error as in 4 is thrown.
6. The loaders except the last are called in order with `suppress = true`, and the first result other than `undefined` is returned. When none can read the file, the last loader is called with `suppress = false`, and its result is returned or its error is thrown.

Because only the last loader is called with `suppress = false`, the error of the last format tried reaches the user when no format can read the file. When `extensions` is omitted, it is the JavaScript error.

It is a separate function instead of using `configFileName` of `rcFile`, so that loading without searching could be added without changing the search and extension completion of `rcFile`. Because `rcFile` keeps its behavior, it was published as a minor release ([#33](https://github.com/azu/rc-config-loader/pull/33)).

## Architecture and sequence diagrams

```mermaid
sequenceDiagram
    participant Tool as Caller
    participant L as loadConfigFile
    participant Loader
    Tool->>L: loadConfigFile(filePath, { cwd })
    L->>L: path.resolve(cwd, filePath)
    alt the file does not exist
        L-->>Tool: ENOENT error
    else the extension is in the table
        L->>Loader: loader of the extension (suppress=false)
        Loader-->>L: config / exception
    else otherwise
        L->>Loader: JSON, YAML (suppress=true)
        Loader-->>L: config / undefined
        L->>Loader: JavaScript (suppress=false)
        Loader-->>L: config / exception
    end
    L-->>Tool: { config, filePath }
```

## Data model and ER diagram

`loadConfigFileOption` (`cwd`, `extensions`) is defined in `src/types.ts`. The return type is `rcConfigResult`, the same as `rcFile`.

## API and interfaces

```ts
export function loadConfigFile<R extends {}>(
    filePath: string,
    opts?: loadConfigFileOption
): rcConfigResult<R>;
```

The "Load exactly one config file" section of the README is the explanation for users.

## External service integration

None.

## Data handling

The configuration that is read is only returned, and is not cached.

## Authentication and authorization

None. Permission to read files follows the Node.js process.

## Security considerations

None. The note about running JavaScript is in [Configuration file formats](../config-formats/requirements.md#security-considerations).

## Deployment notes

None.

## Alternatives considered

### Adding an option to `rcFile`

The proposal in [#33](https://github.com/azu/rc-config-loader/pull/33) did not add an option to `rcFile` to skip the search, and made a separate function instead. No comparison with adding an option is recorded.

### Using the same default extensions as `rcFile`

`rcFile` searches only `.json`, `.yaml`, `.yml`, `.js`, and `.ts` by default, to keep the number of existence checks small.
`loadConfigFile` reads one specified file and does not search, so limiting its default does not make it faster. It would only reject a file the user named, such as `.secretlintrc.cjs`. So it allows every extension by default.

### Treating a file of a disallowed extension the same as `ENOENT`

Treating a disallowed extension as "not found" was an option. Because the file the user specified exists, it is a separate error `code`, so that the tool can say that it does not accept the format.

## Open questions

None.
