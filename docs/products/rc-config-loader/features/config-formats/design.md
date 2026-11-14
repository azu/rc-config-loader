# Design of configuration file formats

[日本語](design.ja.md)

## About this document

This document describes how the [Requirements of configuration file formats](requirements.md) are implemented as one loader per format.
The parent Product is [rc-config-loader](../../product.md).

### Audience

People and agents who change how rc-config-loader reads files.

### Prerequisites

CommonJS modules of Node.js, and the idea of YAML schemas.

### Out of scope

How a file and its loader are chosen is described in the designs of the [Configuration search](../config-search/requirements.md) and [Specified configuration file loading](../config-file-loading/requirements.md) features.

## Implementation approach

There is one loader function per format, and the table from extensions to loaders (`defaultLoaderByExt`) is shared by the search and the loading of a specified file.
All loaders are in `src/rc-config-loader.ts`.

| Extension | Loader |
| --- | --- |
| `.cjs`, `.js` | `loadJSConfigFile` |
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

### JavaScript

The file is read as a string, compiled as a CommonJS module with `require-from-string`, and `module.exports` is returned.
Because the path of the file is passed, a relative `require` in the file is resolved from the location of the file.
The `require` cache is not used, so the content runs every time the same file is read.

## Architecture and sequence diagrams

The loaders are independent functions and do not call each other. The flow of calls is shown in the design of each feature, so no diagram is drawn here.

## Data model and ER diagram

`ExtensionName` is `.cjs | .js | .json | .yaml | .yml`, `Loader` is `(fileName, suppress) => R`, and `ExtensionLoaderMap` is the table from `ExtensionName` to `Loader` (`src/types.ts`).

## API and interfaces

The loaders are not public API.
The public `rcFile` and `loadConfigFile` return the loaded value as `config` of `{ config, filePath }`.

## External service integration

None. The npm packages it depends on are:

- `json5`: parsing JSON
- `js-yaml`: parsing YAML
- `require-from-string`: running JavaScript
- `debug`: printing the progress of loading with `DEBUG=rc-config-loader`

## Data handling

The content that is read is only returned, and is not stored.

## Authentication and authorization

None. Permission to read files follows the Node.js process.

## Security considerations

A JavaScript configuration file runs in the caller's process without a sandbox.

## Deployment notes

None.

## Alternatives considered

### Reading JSON with `require`

This was the earlier implementation. It was changed to read and parse the file because webpack cannot bundle it ([#25](https://github.com/azu/rc-config-loader/issues/25)).
The reason for parsing with JSON5 is not recorded and is unknown.

### Reading JavaScript with `require`

The reason for choosing `require-from-string`, and whether `require` was considered, are not recorded and are unknown.

## Open questions

None.
