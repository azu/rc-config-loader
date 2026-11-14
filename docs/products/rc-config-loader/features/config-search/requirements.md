# Configuration search

[日本語](requirements.ja.md)

## About this document

`rcFile` finds the `.<name>rc` configuration file from the name of a tool, and returns the configuration it finds.
It looks in the starting directory and then in each parent directory in turn.
The parent Product is [rc-config-loader](../../product.md).

### Scope

- The names and extensions of the files to look for
- The search from the starting directory up through the parent directories
- Loading from a field of `package.json`
- Limiting the extensions to search
- What happens when nothing is found, and when a file cannot be read

### Out of scope

- How each format is read is described in [Configuration file formats](../config-formats/requirements.md).
- Loading one file without searching is described in [Specified configuration file loading](../config-file-loading/requirements.md).
- Finding several configuration files and merging them. Only the first one found is returned.

## User stories

### Find the project's configuration file

As a CLI tool author, I want to find the user's configuration file by passing only the tool's name, so that the user gets the same configuration from any directory of the project.

**Acceptance criteria:**

Scenario: When the starting directory has a configuration file, its configuration is returned

- Given: The starting directory has `.foorc.json` with `{ "foo": 1 }`.
- When: The tool calls `rcFile("foo", { cwd: start })`.
- Then: `{ config: { foo: 1 }, filePath: <start>/.foorc.json }` is returned.

Scenario: When only a parent directory has a configuration file, the parent's configuration is returned

- Given: Only the directory two levels above the starting directory has `.foorc.json`.
- When: The tool calls `rcFile("foo", { cwd: start })`.
- Then: The configuration of `.foorc.json` two levels above, and its absolute path, are returned.

Scenario: When no starting directory is given, the search starts from the current directory

- Given: The current directory has `.eslintrc`.
- When: The tool calls `rcFile("eslint")`.
- Then: The configuration of `.eslintrc` in the current directory is returned.

Scenario: When no configuration file exists anywhere, `undefined` is returned

- Given: There is no candidate of `.foorc` from the starting directory up to the root of the file system.
- When: The tool calls `rcFile("foo", { cwd: start })`.
- Then: `undefined` is returned, and no error is thrown.

### Let users write the configuration in package.json

As a CLI tool author, I want users to be able to write the configuration in a field of `package.json`, so that users do not need another configuration file.

**Acceptance criteria:**

Scenario: When `packageJSON` is enabled and there is no configuration file, the field of `package.json` is returned

- Given: The starting directory has no candidate of `.qarrc`, and its `package.json` has `"qar": { "qar": "qar" }`.
- When: The tool calls `rcFile("qar", { cwd: start, packageJSON: true })`.
- Then: `{ config: { qar: "qar" }, filePath: <start>/package.json }` is returned.

Scenario: When a field name is given, that field is returned

- Given: The `package.json` of the starting directory has `"custom": { "key": "value" }`.
- When: The tool calls `rcFile("qar", { cwd: start, packageJSON: { fieldName: "custom" } })`.
- Then: `{ key: "value" }` is returned as the configuration.

Scenario: When `packageJSON` is not given, `package.json` is not read

- Given: The `package.json` of the starting directory has a `"qar"` field, and there is no candidate of `.qarrc`.
- When: The tool calls `rcFile("qar", { cwd: start })`.
- Then: `undefined` is returned.

### Limit the extensions to search

As a CLI tool author, I want to search only the extensions that my tool accepts, so that the tool does not read configuration files in formats it does not expect, especially JavaScript and TypeScript files that are run.

**Acceptance criteria:**

Scenario: When `extensions` is omitted, JSON is preferred to JavaScript

- Given: The starting directory has `.priorityrc.json` and `.priorityrc.js`.
- When: The tool calls `rcFile("priority", { cwd: start })`.
- Then: The configuration of `<start>/.priorityrc.json` is returned.

Scenario: When `extensions` is omitted, `.cjs`, `.mjs`, `.cts`, and `.mts` are not searched

- Given: From the starting directory up through the parents, the only candidate of `.optinrc` is `.optinrc.cjs`.
- When: The tool calls `rcFile("optin", { cwd: start })`, and then `rcFile("optin", { cwd: start, extensions: [".json", ".cjs"] })`.
- Then: The former returns `undefined`, and the latter returns the configuration of `<start>/.optinrc.cjs`.

Scenario: When `extensions` is given, only the candidates with those extensions are searched

- Given: The starting directory has `.limitrc.js` and `.limitrc.json`.
- When: The tool calls `rcFile("limit", { cwd: start, extensions: [".json"] })`.
- Then: The configuration of `<start>/.limitrc.json` is returned. `.limitrc.js` is not run.

Scenario: The order of `extensions` is the priority of the search

- Given: The starting directory has `.limitrc.js` and `.limitrc.json`.
- When: The tool calls `rcFile("limit", { cwd: start, extensions })` with `extensions: [".js", ".json"]` and with `extensions: [".json", ".js"]`.
- Then: The former returns the configuration of `.limitrc.js`, and the latter returns that of `.limitrc.json`.

Scenario: When only a configuration file of an extension that is not given exists, nothing is found

- Given: From the starting directory up through the parents, the only candidate of `.onlyjsrc` is `.onlyjsrc.js`.
- When: The tool calls `rcFile("onlyjs", { cwd: start, extensions: [".json", ".yaml", ".yml"] })`.
- Then: `undefined` is returned.

Scenario: The candidate without an extension is tried as the formats in `extensions`

- Given: The starting directory has `.unknownrc` without an extension, written in JavaScript.
- When: The tool calls `rcFile("unknown", { cwd: start, extensions: [".json", ".yml", ".js"] })`.
- Then: The configuration read as JavaScript and `<start>/.unknownrc` are returned.

Scenario: When only one format can be tried for the candidate without an extension and it cannot read the file, an error is thrown

- Given: The starting directory has `.noextrc` without an extension, written in JavaScript.
- When: The tool calls `rcFile("noext", { cwd: start, extensions: [".json"] })`.
- Then: `.noextrc` is not run as JavaScript, and an error is thrown whose message starts with `Cannot read config file: <start>/.noextrc`.

Scenario: When `extensions` has no format for the candidate without an extension, it is not checked

- Given: The starting directory has `.noextrc` without an extension.
- When: The tool calls `rcFile("noext", { cwd: start, extensions: [".ts"] })`.
- Then: `.noextrc` is not read, and `undefined` is returned.

Scenario: When `extensions` is invalid, an error is thrown

- Given: Nothing.
- When: The tool calls `rcFile("limit", { extensions })` with `extensions: []` or `extensions: [".toml"]`.
- Then: The errors `extensions should be a non-empty array.` and `.toml is not supported.` are thrown respectively.

Scenario: When the removed `defaultExtension` is given, an error is thrown

- Given: Nothing.
- When: The tool calls `rcFile("noext", { defaultExtension: [".js"] })`.
- Then: The error `defaultExtension option is removed. Use extensions option instead.` is thrown.

### Notice a broken configuration file

As a user of a tool, I want an error when a configuration file with an extension is broken, instead of falling back to another configuration, so that the tool does not run with an unintended configuration.

**Acceptance criteria:**

Scenario: When a found file with an extension cannot be read, an error is thrown

- Given: The starting directory has `.invalidjsonrc.json` with invalid JSON, and the parent directory has a valid `.invalidjsonrc.json`.
- When: The tool calls `rcFile("invalidjson", { cwd: start })`.
- Then: An error is thrown whose message starts with `Cannot read config file: <start>/.invalidjsonrc.json`, and the parent's configuration is not returned.

## KPIs

None. No metric has been defined.

## Functional requirements

### Configuration search

**Overview:** Going up from the starting directory to its parents, the first configuration file or `package.json` field that is found is read and returned.

**Input:**

- The name of the tool (`pkgName`)
- `configFileName`: the name of the file to look for. `.<pkgName>rc` by default
- `cwd`: the starting directory of the search. The current directory by default
- `packageJSON`: whether to read `package.json`, and the name of the field to read
- `extensions`: the extensions to search, and their priority. `[".json", ".yaml", ".yml", ".js", ".ts"]` by default. `.cjs`, `.mjs`, `.cts`, and `.mts` are searched only when they are given

**Output:** `{ config, filePath }`. `filePath` is the absolute path of the file that was read. `undefined` when nothing is found.

#### Applicable conditions

##### Candidates

In each directory, the candidates are `configFileName` with extensions, and `configFileName` without an extension.
Only the extensions in `extensions` are added, in the order of `extensions`.
The candidates with an extension are checked before the candidate without one.
A candidate with an extension is read as the format of that extension.

##### Formats for the candidate without an extension

The candidate without an extension is tried as JSON when `extensions` has `.json`, as YAML when it has `.yaml` or `.yml`, and as JavaScript when it has `.js`, in the order these appear in `extensions`.
`.cjs`, `.mjs`, `.ts`, `.cts`, and `.mts` do not add a format for the candidate without an extension.
When there is no format to try, the candidate without an extension is not checked.
By default, it is tried as JSON, YAML, and then JavaScript.

No configuration file is read as a format that is not in `extensions`.
The field of `package.json` follows `packageJSON`, regardless of `extensions`.

##### Order of the search

The candidates in the starting directory are checked, and if none is found, the `package.json` of the same directory is checked (only when `packageJSON` is enabled).
If still nothing is found, the search moves to the parent directory, and repeats up to the root of the file system.
The first one found is returned, and the rest are not checked.

##### A path given as `configFileName`

`configFileName` is resolved as a path relative to each directory.
An absolute path points to the same file from every directory, so only the candidates of that file are checked.
A relative path is also looked for with the same relative path from the parent directories.

##### package.json

When `packageJSON` is `true`, the `pkgName` field is read. When it is `{ fieldName }`, the `fieldName` field is read.
When the value of the field is empty (such as `undefined`), it is treated as not found, and the search moves to the parent directory.

##### When the value read is empty

When the value read from a candidate file is empty (such as `undefined` or `null`), the file is treated as not found, and the next candidate is checked.

#### Exceptional behavior

##### A candidate with an extension cannot be read

The error of [Configuration file formats](../config-formats/requirements.md#the-file-cannot-be-read-as-the-format) is thrown, and the search stops.

##### The candidate without an extension cannot be read

When only one format is tried, the error of that format is thrown, and the search stops.
For the case where two or more formats are tried, see the open questions.

##### Invalid `extensions`

When `extensions` is an empty array, the error `extensions should be a non-empty array.` is thrown.
When it includes an extension that is not in the table of [Configuration file formats](../config-formats/requirements.md#extensions-and-formats), the error `<extension> is not supported.` is thrown.

##### `defaultExtension` is given

`defaultExtension` was removed. When it is given, the error `defaultExtension option is removed. Use extensions option instead.` is thrown.

##### package.json cannot be read

When `packageJSON` is enabled and `package.json` cannot be parsed as JSON5, the parse error is thrown as it is.

## Data requirements

### Required data

- **Configuration file:** A file named `.<pkgName>rc`, or that name with an extension.
- **package.json:** The field read when `packageJSON` is enabled.

### Relationships

One search returns only one configuration file or one field of `package.json`.

### Personal information

None.

## External service dependencies

None. Only the local file system is read.

## Security considerations

Because the search goes up to the parents, a configuration file in a parent directory outside the project can be read.
When a JavaScript or TypeScript configuration file is found, its code is run.
When the JavaScript and TypeScript extensions are left out of `extensions`, such configuration files are not run.

## Open questions

### When the candidate without an extension cannot be read as any format (unconfirmed)

- **To confirm:** When two or more formats are tried for the candidate without an extension (including the default), and it cannot be read as any of them, whether to throw an error or to treat it as not found and continue the search.
- **Candidates and sources:** The README says that `rcFile` throws an error if the content of the configuration file is malformed. `src/rc-config-loader.ts` does not throw in this case, and moves on to the next candidate and the parent directories. No test covers this case.
- **Until decided:** The body does not state either behavior.
- **Decided by:** azu
