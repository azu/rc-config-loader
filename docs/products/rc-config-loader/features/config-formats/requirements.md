# Configuration file formats

[日本語](requirements.ja.md)

## About this document

rc-config-loader reads configuration files written in JSON, YAML, JavaScript, or TypeScript, and returns them as configuration objects.
This document describes which format a file is read as, based on its name, and how each format is read.
Both [Configuration search](../config-search/requirements.md) and [Specified configuration file loading](../config-file-loading/requirements.md) use these formats.
The parent Product is [rc-config-loader](../../product.md).

### Scope

- The mapping from extensions to formats
- How JSON, YAML, JavaScript, and TypeScript are read
- The Node.js version required to run
- The error when a file cannot be read

### Out of scope

- Deciding which file to read, including the order of formats tried for a file without an extension. This is described in [Configuration search](../config-search/requirements.md) and [Specified configuration file loading](../config-file-loading/requirements.md).
- Validating the content of a configuration. The meaning of the configuration object is decided by the program that uses rc-config-loader.
- Asynchronous configuration files. ECMAScript Modules that use top-level `await` cannot be read, to keep the API synchronous.
- Settings of type stripping by `tsconfig.json`, and type checking.

## User stories

### Write the configuration in the format I like

As a user of a tool, I want to write the configuration file in JSON, YAML, JavaScript, or TypeScript, whichever I like, so that I can configure the tool in the way that fits my project.

**Acceptance criteria:**

Scenario: When a JSON file has comments, the configuration without the comments is returned

- Given: `.foorc.json` contains comments and `{ "foo": 1 }`.
- When: A program reads the file.
- Then: `{ foo: 1 }` is returned as the configuration.

Scenario: When the file is YAML, the configuration read as YAML is returned

- Given: `.foorc.yml` contains `foo: 1`.
- When: A program reads the file.
- Then: `{ foo: 1 }` is returned as the configuration.

Scenario: When a YAML file is empty or has only comments, an empty configuration is returned

- Given: `.foorc.yml` is empty, or contains only comments.
- When: A program reads the file.
- Then: `{}` is returned as the configuration, and no error is thrown.

Scenario: When a YAML file has merge keys or timestamps, the expanded configuration is returned

- Given: `.foorc.yml` contains a `<<` merge key and a timestamp such as `2001-12-14`.
- When: A program reads the file.
- Then: The merge key is expanded, and the timestamp is returned as a `Date`.

Scenario: When the file is JavaScript, the value of `module.exports` is returned

- Given: `.foorc.js` or `.foorc.cjs` contains `module.exports = { foo: 1 }`.
- When: A program reads the file.
- Then: `{ foo: 1 }` is returned as the configuration.

Scenario: When the file is ECMAScript Modules, the value of `export default` is returned

- Given: `.foorc.mjs` contains `export default { foo: 1 }`.
- When: A program reads the file.
- Then: `{ foo: 1 }` is returned as the configuration. The module namespace object with `default` is not returned.

Scenario: When the file is TypeScript, the value run after removing the types is returned

- Given: `.foorc.ts` contains `const config: Config = { foo: 1 }` with a type annotation, and `export default config`.
- When: A program reads the file on Node.js 22.18.0 or later.
- Then: `{ foo: 1 }` is returned as the configuration.

### Notice a broken configuration file

As a user of a tool, I want to know which file could not be read when a configuration file is broken, so that I know which file to fix.

**Acceptance criteria:**

Scenario: When the JSON syntax is wrong, the error includes the location of the file

- Given: The content of `.foorc.json` is `{bad`.
- When: A program reads the file.
- Then: An error is thrown whose message starts with `Cannot read config file: <absolute path of the file>` and includes the original error.

Scenario: When a YAML file has more than one document, an error is thrown

- Given: `.foorc.yml` contains two documents separated by `---`.
- When: A program reads the file.
- Then: An error is thrown that says a single document is expected.

Scenario: When ECMAScript Modules use top-level `await`, an error is thrown

- Given: `.foorc.mjs` contains top-level `await`.
- When: A program reads the file.
- Then: An error is thrown whose message starts with `Cannot read config file: <absolute path of the file>`.

Scenario: When a TypeScript file uses syntax that cannot run by removing types only, an error is thrown

- Given: `.foorc.ts` contains an `enum`.
- When: A program reads the file.
- Then: An error is thrown whose message starts with `Cannot read config file: <absolute path of the file>`.

## KPIs

None. No metric has been defined.

## Functional requirements

### Loading each format

**Overview:** One configuration file is read as the selected format, and a configuration object is returned.

**Input:** The absolute path of the configuration file, and the format to read it as.

**Output:** A configuration object.

#### Applicable conditions

##### Extensions and formats

| Extension | Format |
| --- | --- |
| `.json` | JSON |
| `.yaml`, `.yml` | YAML |
| `.js`, `.cjs`, `.mjs` | JavaScript (CommonJS or ECMAScript Modules) |
| `.ts`, `.cts`, `.mts` | TypeScript |

No format can be mapped to an extension that is not in this table.

##### JSON

The file is read as JSON5. A file with comments or trailing commas can be read.

##### YAML

The file is read as YAML 1.2, with `<<` merge keys and timestamps.
An empty file, a file with only whitespace or comments, and an empty document such as only `---` are treated as an empty configuration `{}`.
A file with more than one document cannot be read.

##### JavaScript

The file is run as a Node.js module. Node.js decides whether it is CommonJS or ECMAScript Modules from the extension and the `type` of `package.json`.
The configuration is the value of `module.exports` for CommonJS, and the value of `export default` for ECMAScript Modules.
`require` and `import` in the file are resolved from the location of the file.
ECMAScript Modules must be loadable synchronously, and cannot use top-level `await`.

A CommonJS file is run again every time it is read.
For an ECMAScript Modules file, the content read first is used within the same process, and a changed file is not read again.

##### TypeScript

The types are removed by Node.js's type stripping, and the file is run by the same rules as JavaScript.
Only syntax that can run by removing types is allowed. `enum` and `namespace` with runtime code cannot be used.
`tsconfig.json` is not read, and types are not checked.

##### Node.js version

It runs on Node.js 22.18.0 or later, the first 22.x version where type stripping is enabled by default.

#### Exceptional behavior

##### The file cannot be read as the format

When the file cannot be read, for example because of a syntax error, an error is thrown whose message includes `Cannot read config file: <absolute path of the file>` and the original error.
However, when a file without an extension is tried as several formats, a failure while trying is not an error.
Which failure finally becomes the error is decided in the Requirements of each feature.

## Data requirements

### Required data

- **Configuration file:** A UTF-8 text file on the local file system.
- **Configuration object:** The result of reading a configuration file. Its meaning is decided by the program that uses rc-config-loader.

### Relationships

One configuration object is returned from one configuration file.

### Personal information

None. The content of a configuration file is only returned to the program that reads it, and is neither stored nor sent.

## External service dependencies

None. Only local files are read.

## Security considerations

JavaScript and TypeScript configuration files run with the same permissions as the program that reads them.
Reading such a configuration file is the same as running the code in the file.

## Open questions

None.
