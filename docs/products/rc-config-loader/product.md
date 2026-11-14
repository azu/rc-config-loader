# rc-config-loader

[日本語](product.ja.md)

## Overview

rc-config-loader is a Node.js library that finds and loads `.<name>rc` configuration files such as `.textlintrc` and `.eslintrc`.
It reads JSON, YAML, JavaScript, and TypeScript configuration files and a field of `package.json`, and returns the configuration object with the absolute path of the file.
Its API consists of synchronous functions, so a caller can load a configuration without becoming asynchronous.
It is distributed as an npm package and includes TypeScript type definitions. It runs on Node.js 22.18.0 or later.

## Background and problems

### Background

Many CLI tools work by reading a configuration file that the user puts in the project.
The name `.<tool name>rc` is widely used for such files, and many tools let the user choose the format by the extension.
When each tool implements finding the file and loading each format, every tool carries the same code and dependencies.

### Problems to solve

- A CLI tool author has to implement finding a configuration file and loading each format by themselves.
- When a user runs the tool in a subdirectory of the project, the tool still needs to find the project's configuration file.
- When a user specifies a path with an option, the tool needs to load only that file.
- When a configuration file is broken, the user needs to know which file could not be read.

## Target users

### CLI tool authors

- **Characteristics:** Developers who build Node.js CLI tools, such as textlint, that work by reading the user's configuration file.
- **Problems:** They do not want to write the code that finds a configuration file and loads each format for every tool.
- **Usage context:** When the tool starts, it finds the configuration file by the tool's name, or loads the file given by an option such as `--config`.

## Value provided

### Loading a configuration with a synchronous API

- **Recipient:** CLI tool authors
- **Offering:** Finding and loading a configuration file are provided as synchronous functions that return the value directly.
- **Reason:** A synchronous API is the positioning of rc-config-loader. A caller does not need to become asynchronous to load a configuration.

### Several formats under one name

- **Recipient:** CLI tool authors
- **Offering:** Given only the tool's name, it finds and loads `.<name>rc` JSON, YAML, JavaScript, and TypeScript configuration files and the field of `package.json`.
- **Reason:** Users write the configuration in the format that fits their project, and authors do not need code for each format.

### Errors that show which file could not be read

- **Recipient:** CLI tool authors and their users
- **Offering:** When a configuration file cannot be read, it throws an error that includes the path of the file. When a specified file does not exist, the error has the `ENOENT` code.
- **Reason:** Users learn which file to fix, and authors can show a message that fits the situation.

## Key concepts

- **rc file (configuration file):** A file named `.<name>rc`, or that name with an extension such as `.json` or `.yml`. The README calls it "rc file" or "config file".
- **Search:** Looking for a configuration file from the starting directory up through its parent directories.
- **Starting directory (`cwd`):** The directory where the search starts, or the directory that a relative path is resolved from.
- **Extensions (`extensions`):** The extensions of configuration files to search or allowed to load, and their priority. They also decide the formats to try for a configuration file without an extension.
- **package.json field:** A configuration written in one field of `package.json` instead of a configuration file.
- **Configuration object (`config`):** The result of reading a configuration file. Its meaning is decided by the tool that uses rc-config-loader.

## Feature list

| Feature | Description | Specification |
| --- | --- | --- |
| Configuration search | Find `.<name>rc` from the starting directory up through the parents by the tool's name, and load it (`rcFile`) | [Requirements](features/config-search/requirements.md) |
| Specified configuration file loading | Load only the one file given by a path, without searching (`loadConfigFile`) | [Requirements](features/config-file-loading/requirements.md) |
| Configuration file formats | Read JSON, YAML, JavaScript, and TypeScript configuration files according to the extension | [Requirements](features/config-formats/requirements.md) |

## Definition of success

Not defined.

## Guidelines for product development

- Keep the API as synchronous functions.

## SLA, SLI, and SLO

### SLA

None. It is an open source library under the MIT License, provided without warranty.

### SLI and SLO

None. It is a library that runs in the user's environment, and there is no service to operate.

## Open questions

None.
