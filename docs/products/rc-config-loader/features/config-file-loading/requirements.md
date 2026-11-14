# Specified configuration file loading

[日本語](requirements.ja.md)

## About this document

`loadConfigFile` loads only the one configuration file given by a path, and returns the configuration.
It is used when a CLI tool loads the file that the user specifies with an option such as `--config <path>`.
The parent Product is [rc-config-loader](../../product.md).

### Scope

- Resolving the path
- Choosing the format by the extension
- How a file whose format is not decided by the extension is read
- The errors when the file does not exist and when it cannot be read

### Out of scope

- How each format is read is described in [Configuration file formats](../config-formats/requirements.md).
- Finding a configuration file is described in [Configuration search](../config-search/requirements.md).

## User stories

### Load only the file the user specified

As a CLI tool author, I want to load only the configuration file that the user specified with an option, so that no other file is loaded by mistake.

When a path is passed to `configFileName` of `rcFile`, a relative path is also looked for in the parent directories, and extensions are added to the name.
Because of that, specifying `rc.json` in a subdirectory could load `../rc.json` ([#33](https://github.com/azu/rc-config-loader/pull/33)).

**Acceptance criteria:**

Scenario: When a file with an extension is specified, the configuration read as that format is returned

- Given: The starting directory has one of `rc.json`, `rc.yaml`, `rc.yml`, `rc.js`, and `rc.cjs`.
- When: The tool calls `loadConfigFile(<file name>, { cwd: start })`.
- Then: The configuration read as the format of the extension, and the absolute path of the file, are returned.

Scenario: When a relative path is specified, it is resolved from `cwd`

- Given: The starting directory has `sub/sub.json`.
- When: The tool calls `loadConfigFile("sub/sub.json", { cwd: start })`.
- Then: The configuration of `<start>/sub/sub.json` and its absolute path are returned.

Scenario: When `cwd` is not given, the path is resolved from the current directory

- Given: A relative path from the current directory points to a `rc.json`.
- When: The tool calls `loadConfigFile(<relative path>)`.
- Then: The configuration of that `rc.json` is returned.

Scenario: When an absolute path is specified, that file is read regardless of `cwd`

- Given: There is the absolute path of `rc.json`, and `cwd` is another directory.
- When: The tool calls `loadConfigFile(<absolute path>, { cwd: another directory })`.
- Then: The configuration of the specified `rc.json` is returned.

Scenario: When the specified location has no file and the parent has one, the parent's file is not read

- Given: The starting directory has no `rc.json`, and the parent directory has `rc.json`.
- When: The tool calls `loadConfigFile("rc.json", { cwd: start })`.
- Then: An error is thrown whose `code` is `ENOENT` and whose `path` is `<start>/rc.json`.

Scenario: When a name without an extension is specified, no extension is added

- Given: The starting directory has `rc.json`, but no `rc`.
- When: The tool calls `loadConfigFile("rc", { cwd: start })`.
- Then: An error whose `code` is `ENOENT` is thrown.

### Load a configuration file without an extension

As a CLI tool author, I want to specify and load a file without an extension, such as `.secretlintrc`, so that users can specify it with the same option whatever format they write it in.

**Acceptance criteria:**

Scenario: When a file without an extension is JSON, YAML, or JavaScript, the configuration is returned

- Given: The starting directory has `.jsonrc`, `.yamlrc`, and `.jsrc` without an extension, written in JSON, YAML, and JavaScript.
- When: The tool calls `loadConfigFile(<file name>, { cwd: start })`.
- Then: The configuration read as each format is returned.

Scenario: When a file without an extension cannot be read as any format, an error is thrown

- Given: The starting directory has `.invalidrc`, whose content is invalid as every format.
- When: The tool calls `loadConfigFile(".invalidrc", { cwd: start })`.
- Then: An error is thrown whose message starts with `Cannot read config file: <start>/.invalidrc`.

### Tell a missing file from a broken file

As a CLI tool author, I want to tell whether the specified file does not exist or exists but cannot be read, so that I can show the user a message that fits each case.

**Acceptance criteria:**

Scenario: When the file does not exist, an `ENOENT` error is thrown

- Given: The starting directory has no `not-found.json`.
- When: The tool calls `loadConfigFile("not-found.json", { cwd: start })`.
- Then: An error is thrown whose `code` is `ENOENT` and whose `path` is `<start>/not-found.json`.

Scenario: When the file cannot be read, a `Cannot read config file` error is thrown

- Given: `invalid.json` in the starting directory has invalid JSON.
- When: The tool calls `loadConfigFile("invalid.json", { cwd: start })`.
- Then: An error is thrown whose message starts with `Cannot read config file: <start>/invalid.json`.

## KPIs

None. No metric has been defined.

## Functional requirements

### Specified configuration file loading

**Overview:** Only the file at the specified path is read, and the configuration is returned.

**Input:**

- `filePath`: the path of the configuration file. An absolute path, or a path relative to `cwd`
- `cwd`: the directory that a relative path is resolved from. The current directory by default

**Output:** `{ config, filePath }`. `filePath` is the absolute path of the file that was read.

#### Applicable conditions

##### The file to read

Only the one file that `filePath` points to from `cwd` is read.
Parent directories are not searched, no extension is added to the name, and `package.json` is not read.

##### Choosing the format

When the extension is in the table of [Configuration file formats](../config-formats/requirements.md#extensions-and-formats), the file is read as that format.
An extension not in the table, and a name without an extension, are tried as JSON, YAML, and then JavaScript, and the configuration of the first format that can read the file is returned.

#### Exceptional behavior

##### The file does not exist

An error is thrown with the message `Config file not found: <absolute path>`, the `code` `ENOENT`, and the absolute path as `path`.

##### The file cannot be read as the format chosen by the extension

The error of [Configuration file formats](../config-formats/requirements.md#the-file-cannot-be-read-as-the-format) is thrown.

##### The file cannot be read as any format

The error from reading the file as JavaScript is thrown. Its message starts with `Cannot read config file: <absolute path>`.

## Data requirements

### Required data

- **Configuration file:** The one file that the user specified.

### Relationships

One call returns one configuration from one file.

### Personal information

None.

## External service dependencies

None. Only the local file system is read.

## Security considerations

When the content of the specified file is read as JavaScript, its code is run.
A name without an extension is also run as JavaScript when it cannot be read as JSON or YAML.

## Open questions

None.
