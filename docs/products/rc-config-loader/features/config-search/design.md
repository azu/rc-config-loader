# Design of configuration search

[日本語](design.ja.md)

## About this document

This document describes how the [Requirements of configuration search](requirements.md) are implemented with `rcFile` and `findConfig`.
The parent Product is [rc-config-loader](../../product.md).

### Audience

People and agents who change the search of `rcFile`.

### Prerequisites

[Configuration file formats](../config-formats/requirements.md). The loader of each format throws an error when it cannot read the file if `suppress` is `false`, and returns `undefined` if `suppress` is `true`.

### Out of scope

The implementation of the loader of each format is described in the design of the configuration file formats feature.

## Implementation approach

`rcFile` fills in the default options, builds the tables used for the search, and leaves the search to the recursive function `findConfig`.
Everything is in `src/rc-config-loader.ts`, and only synchronous file operations are used.

### 1. Decide the options

`configFileName`, `defaultExtension`, `cwd`, and `packageJSON` are filled in with the defaults when omitted.
When `packageJSON` is an object, its `fieldName` is the field name. Otherwise, `pkgName` is the field name.

### 2. Decide the extensions to search

`resolveAllowedExtensions` decides the array of extensions allowed to search (`allowedExtensions`).
When `extensions` is omitted, it returns all keys of `defaultLoaderByExt` in the order of the table. When it is given, it returns that array.
When the given array is empty, it throws `extensions should be a non-empty array.`, and when it includes an extension not in the table, it throws `<extension> is not supported.`.

When `defaultExtension` is omitted, only the extensions of the default `[".json", ".yaml", ".yml", ".js", ".cjs"]` that are in `allowedExtensions` are kept.
When `extensions` is omitted, `allowedExtensions` has every extension, so the default is kept as it is.

### 3. Decide the loaders for the candidate without an extension

Each extension of `defaultExtension` is turned into a loader with `selectLoader`.
`selectLoader` throws `<extension> is not supported.` for an extension that is not in the shared table `defaultLoaderByExt`.
Then, `<extension> in defaultExtension is not included in extensions.` is thrown for an extension that is not in `allowedExtensions`.
When `defaultExtension` is an array, the result is an array of loaders (`loadersByOrder`). When it is one extension, the result is one loader.

The search table `loaderByExt` has the loader of each extension in the order of `allowedExtensions`, and `loadersByOrder` added last as the empty-string extension.
When `loadersByOrder` is an empty array, the empty-string extension is not added.

### 4. Check the candidates in each directory

`cwd` is made absolute with `path.resolve` and split by the separator into the array `parts`.
`findConfig` checks, in the order of the keys of `loaderByExt`, the location made by joining the directory of `parts` and `configFileName + extension` with `path.resolve`.
The order of the keys is the order in which the table was built. When `extensions` is omitted, it is `.cjs`, `.js`, `.mjs`, `.json`, `.yaml`, `.yml`, `.ts`, `.cts`, `.mts`, and the empty string.
Because the join uses `path.resolve`, the directory is ignored when `configFileName` is an absolute path.

When a file is found with `fs.existsSync`, it is read as follows.

- When there is one loader (a candidate with an extension, or one `defaultExtension`), it is read with `suppress = false`. An error is thrown if it cannot be read.
- When there is an array of loaders, they are tried in order with `suppress = true`, and the result of the first loader that returns a value is used. If all return `undefined`, the candidate is skipped.

In both cases, when the value read is falsy, the next candidate is checked.

A candidate with one loader is not read twice. Earlier, one loader was treated as an array, and the same file was run twice. This was fixed because it is a problem when a configuration file has side effects ([#4](https://github.com/azu/rc-config-loader/pull/4)).

### 5. Check package.json

When no candidate is found and `packageJSON` is enabled, the `package.json` of the same directory is read with `JSON5.parse`, and the value of the field is returned when it is truthy.

### 6. Move to the parent

The last element of `parts` is removed, and `findConfig` is called again.
When `parts` is empty, `undefined` is returned.

## Architecture and sequence diagrams

```mermaid
sequenceDiagram
    participant Tool as Caller
    participant rcFile
    participant findConfig
    participant Loader
    Tool->>rcFile: rcFile(pkgName, opts)
    rcFile->>rcFile: fill defaults, build loaderByExt
    rcFile->>findConfig: parts, loaderByExt, ...
    loop each directory (from the start to the root)
        loop candidates with and without an extension
            findConfig->>Loader: read a found candidate
            Loader-->>findConfig: config / undefined / exception
        end
        findConfig->>findConfig: package.json field (when enabled)
    end
    findConfig-->>rcFile: { config, filePath } or undefined
    rcFile-->>Tool: result
```

## Data model and ER diagram

`rcConfigLoaderOption` (`packageJSON`, `configFileName`, `defaultExtension`, `cwd`, `extensions`) and the return type `rcConfigResult` (`config`, `filePath`) are defined in `src/types.ts`.

## API and interfaces

```ts
export function rcFile<R extends {}>(
    pkgName: string,
    opts?: rcConfigLoaderOption
): rcConfigResult<R> | undefined;
```

The API section of the README is the explanation for users.

## External service integration

None.

## Data handling

The configuration that is read is only returned, and is not cached. Files are read again on every call.

## Authentication and authorization

None. Permission to read files follows the Node.js process.

## Security considerations

The search goes up to the root of the file system, and there is no option to stop it on the way.
When `extensions` is given, files of the other extensions are not even checked with `fs.existsSync`, so they are neither read nor run.

## Deployment notes

None.

## Alternatives considered

No alternatives or reasons are recorded for searching up through the parents, for checking the candidates with an extension first, or for checking `package.json` after the candidates of the same directory, so they are unknown.
The search is based on [zkochan/rcfile](https://github.com/zkochan/rcfile).

### Limiting by default when `extensions` is omitted

Supporting TypeScript and ECMAScript Modules adds extensions to search, so limiting them by default was an option. To keep the behavior of existing tools, every extension is searched when the option is omitted.

### Widening `defaultExtension` to also mean the extensions to search

`defaultExtension` means which formats to try for the candidate without an extension, so it is kept with that meaning, and the extensions to search are a separate option, `extensions`.
When `defaultExtension` is omitted, `extensions` limits its default, so that giving only `extensions` is enough to keep other formats from being read.

## Open questions

None. The unconfirmed items about the behavior are in the [open questions of the Requirements](requirements.md#open-questions).
