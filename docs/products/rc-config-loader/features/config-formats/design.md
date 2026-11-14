# Design of configuration file formats

[日本語](design.ja.md)

## About this document

This document describes how the [Requirements of configuration file formats](requirements.md) are implemented as one loader per format.
The parent Product is [rc-config-loader](../../product.md).

### Audience

People and agents who change how rc-config-loader reads files.

### Prerequisites

CommonJS and ECMAScript Modules of Node.js, `require(esm)`, type stripping, and the idea of YAML schemas.

### Out of scope

How a file and its loader are chosen is described in the designs of the [Configuration search](../config-search/requirements.md) and [Specified configuration file loading](../config-file-loading/requirements.md) features.

## Implementation approach

There is one loader function per format, and the table from extensions to loaders (`defaultLoaderByExt`) is shared by the search and the loading of a specified file.
All loaders are in `src/rc-config-loader.ts`.

| Extension | Loader |
| --- | --- |
| `.cjs`, `.js`, `.mjs`, `.ts`, `.cts`, `.mts` | `loadJSConfigFile` |
| `.json` | `loadJSONConfigFile` |
| `.yaml`, `.yml` | `loadYAMLConfigFile` |

Each loader takes the absolute path of the file and `suppress`, and returns a configuration object.
When `suppress` is `false` and the file cannot be read, the loader adds `Cannot read config file: <path>\nError: ` to the start of the message and throws the original error again.
When `suppress` is `true`, the loader returns `undefined` instead of throwing.
When a file without an extension is tried as several formats, the caller passes `true`, and treats `undefined` as "cannot be read as this format" and moves to the next loader.

### JSON

The file is read with `fs.readFileSync` and parsed with `JSON5.parse` of `json5`.
It used to be read with `require`, but webpack cannot resolve a dynamic `require` when bundling, so it was changed to read and parse the file ([#25](https://github.com/azu/rc-config-loader/issues/25), [#26](https://github.com/azu/rc-config-loader/pull/26)).

### YAML

`js-yaml` is `require`d only when a YAML file is read, so that calls that do not use YAML do not spend time loading it.
The schema is `CORE_SCHEMA` with `mergeTag` and `timestampTag` added.
The default of js-yaml v5 is the YAML 1.2 `CORE_SCHEMA`, and the two tags are added to handle merge keys and timestamps in the same way as the default schema of v4.

The content is parsed once with `loadAll`.
With zero documents, `{}` is returned, because `load` of js-yaml v5 throws on empty input while `loadAll` returns an empty array.
With two or more documents, the content is parsed again with `load` to throw the same "expected a single document" error as `load`.
With one document whose value is `null` (such as only `---`), `{}` is returned.

### JavaScript and TypeScript

JavaScript and TypeScript are read by the same loader.
The path of the file is resolved with `require.resolve`, the path is deleted from `require.cache`, and then the file is read with Node.js's `require()`.

- A CommonJS file runs again every time it is read, because its cache is deleted.
- ECMAScript Modules are read with Node.js's [`require(esm)`](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require). Node.js has no way to delete the cache of ECMAScript Modules, so the second read in the same process returns the first content. When the file contains top-level `await`, Node.js throws `ERR_REQUIRE_ASYNC_MODULE`.
- TypeScript is read with Node.js's [type stripping](https://nodejs.org/api/typescript.html#type-stripping). For syntax that cannot run by type stripping, Node.js throws `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`.

`require(esm)` returns the module namespace object (`{ __esModule: true, default: config }`).
`interopDefault` returns `default` when the returned value has `__esModule` and `default`, and returns the value as it is otherwise.

An error thrown by Node.js is also thrown again with `Cannot read config file`, following `suppress`, in the same way as other formats.

## Architecture and sequence diagrams

The loaders are independent functions and do not call each other. The flow of calls is shown in the design of each feature, so no diagram is drawn here.

## Data model and ER diagram

`ExtensionName` is `.cjs | .js | .mjs | .json | .yaml | .yml | .ts | .cts | .mts`, `Loader` is `(fileName, suppress) => R`, and `ExtensionLoaderMap` is the table from `ExtensionName` to `Loader` (`src/types.ts`).

## API and interfaces

The loaders are not public API.
The public `rcFile` and `loadConfigFile` return the loaded value as `config` of `{ config, filePath }`.

## External service integration

None. The npm packages it depends on are:

- `json5`: parsing JSON
- `js-yaml`: parsing YAML
- `debug`: printing the progress of loading with `DEBUG=rc-config-loader`

## Data handling

The content that is read is only returned, and is not stored.

## Authentication and authorization

None. Permission to read files follows the Node.js process.

## Security considerations

JavaScript and TypeScript configuration files run in the caller's process without a sandbox.

## Deployment notes

None.

## Alternatives considered

### Reading JSON with `require`

This was the earlier implementation. It was changed to read and parse the file because webpack cannot bundle it ([#25](https://github.com/azu/rc-config-loader/issues/25)).
The reason for parsing with JSON5 is not recorded and is unknown.

### Reading JavaScript with `require-from-string`

This was the earlier implementation. It only passes the content of the file as a string to `Module._compile()`, so types are not removed, and TypeScript cannot be read.
Leaving it to Node.js's `require()` gives both type stripping and `require(esm)`, so it was changed to `require()` ([#35](https://github.com/azu/rc-config-loader/pull/35)).
The reason for first choosing `require-from-string` is not recorded and is unknown.

### Removing types with `module.stripTypeScriptTypes()` before running

This passes the string with types removed by [`module.stripTypeScriptTypes()`](https://nodejs.org/api/module.html#modulestriptypescripttypescode-options) to `require-from-string`.
It exists since Node.js 22.13.0, but it is still a release candidate, and Node.js 22 prints an ExperimentalWarning when it runs, so it was not chosen.

### Keeping Node.js 20 with a clear error on old Node.js

Type stripping is not available on Node.js 20. Keeping Node.js 20 and throwing an error only for TypeScript was possible, but Node.js 20 reached end of life on 2026-04-30, so this became a major release that requires Node.js 22.18.0 or later ([#35](https://github.com/azu/rc-config-loader/pull/35)).

## Open questions

None.
