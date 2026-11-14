# rc-config-loader [![Actions Status: test](https://github.com/azu/rc-config-loader/workflows/test/badge.svg)](https://github.com/azu/rc-config-loader/actions?query=workflow%3A"test")

Load config from `.{product}rc.{json,yml,js,ts}` file.

It is a Node.js library for loading `.textlintrc`, `.eslintrc`, `.stylelintrc` etc...

## Features

Find and load a configuration object from:

- a `package.json` property if it is needed
- a JSON or YAML, JS, TypeScript "rc file"
    - `.<product>rc` or `.<product>rc.json` or `.<product>rc.js` or`.<product>rc.yml`, `.<product>rc.yaml`
    - `.<product>rc.ts`
    - `.<product>rc.cjs`, `.<product>rc.mjs`, `.<product>rc.cts`, `.<product>rc.mts` (only when they are in `extensions` option)
- CommonJS and ES Modules config file
- TypeScript support
    - Includes `.d.ts`

## Difference

### with [MoOx/rc-loader](https://github.com/MoOx/rc-loader "MoOx/rc-loader")

- Safe API
    - `rc` contains shabang in `.js` file
- Enhance Error message

### with [cosmiconfig](https://github.com/davidtheclark/cosmiconfig "cosmiconfig")

- <del>Sync loading</del>
    - [cosmiconfig@3+](https://github.com/davidtheclark/cosmiconfig/blob/master/CHANGELOG.md#300) support `sync` option
- <del>Built-in TypeScript support</del>
    - [comisconfig@6*](https://github.com/davidtheclark/cosmiconfig/blob/master/CHANGELOG.md#600) is written by TypeScript

If you want to async support and customize loader, recommended to use [cosmiconfig](https://github.com/davidtheclark/cosmiconfig).

## Requirements

- Node.js 22.18.0 or later
    - TypeScript config file uses Node.js's built-in [type stripping](https://nodejs.org/api/typescript.html#type-stripping)
    - ES Modules config file uses Node.js's [`require(esm)`](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)

## Install

Install with [npm](https://www.npmjs.com/):

    npm install rc-config-loader

## Usage

### API

```ts
export interface rcConfigLoaderOption {
    // does look for `package.json`
    packageJSON?:
        | boolean
        | {
              fieldName: string;
          };
    // if config file name is not same with packageName, set the name
    configFileName?: string;
    // where start to load
    cwd?: string;
    // extensions to search, in order of priority
    // A file without extension like `.<product>rc` is tried as the formats of `.json`, `.yaml`/`.yml`, and `.js` in this list
    // Default: [".json", ".yaml", ".yml", ".js", ".ts"]
    // `.cjs`, `.mjs`, `.cts`, and `.mts` are searched only when they are given
    extensions?: string[];
}
/**
 * Find and load rcfile, return { config, filePath }
 * If not found any rcfile, throw an Error.
 * @param {string} pkgName
 * @param {rcConfigLoaderOption} [opts]
 * @returns {{ config: Object, filePath:string } | undefined}
 */
export declare function rcFile<R extends {}>(pkgName: string, opts?: rcConfigLoaderOption): {
    config: R;
    filePath: string;
} | undefined;

```

`rcFile` return `{ config, filePath }` object.

- `config`: it is config object
- `filePath`: absolute path to config file

**Note:**
 
- `rcFile` function return `undefined` if the config file is not found
- `rcFile` throw an Error if the config file content is malformed (causing a parsing error)

Recommenced usage:

```js
import { rcFile } from "rc-config-loader"

function loadRcFile(rcFileName){
    try {
        const results = rcFile(rcFileName);
        // Not Found
        if (!results) {
            return {};
        }
        return results.config;
    } catch (error) {
        // Found it, but it is parsing error
        return {} ; // default value
    }
}
// load config
const config = loadRcFile("your-application");
console.log(config); // => rcfile content
```

It will check these files and return config file if found it.

- `.your-applicationrc.json`
- `.your-applicationrc.yaml`
- `.your-applicationrc.yml`
- `.your-applicationrc.js`
- `.your-applicationrc.ts`
- `.your-applicationrc` (tried as JSON, YAML, then JavaScript)

`.your-applicationrc.cjs`, `.your-applicationrc.mjs`, `.your-applicationrc.cts`, and `.your-applicationrc.mts` are not searched by default.
Add them to `extensions` option if your tool supports them. See [Limit the extensions](#limit-the-extensions).
- [optional] `package.json`
  - if `packageJSON` option is enabled

### Load exactly one config file

`loadConfigFile` loads exactly one config file.
Use it when a user specifies the config file path by a CLI option like `--config <path>`.

```ts
export interface loadConfigFileOption {
    // the base directory to resolve a relative file path. Default: `process.cwd()`
    cwd?: string;
    // extensions allowed to load. Default: all supported extensions
    extensions?: string[];
}
export declare function loadConfigFile<R extends {}>(filePath: string, opts?: loadConfigFileOption): {
    config: R;
    filePath: string;
};
```

- `filePath` is resolved from `opts.cwd`
- It does not search parent directories, does not append any extension, and does not read `package.json`
- The loader is selected by the extension of `filePath`
    - `.json` → JSON(JSON5)
    - `.yaml` or `.yml` → YAML
    - `.js`, `.cjs`, or `.mjs` → JavaScript
    - `.ts`, `.cts`, or `.mts` → TypeScript
    - Other names like `.your-applicationrc` are tried as JSON, YAML, then JavaScript
- It returns `{ config, filePath }`, and `filePath` is the absolute path to the config file

**Note:**

- `loadConfigFile` throws an Error that has `code: "ENOENT"` if the config file is not found
- `loadConfigFile` throws an Error if the config file content is malformed (causing a parsing error)

```js
import { loadConfigFile } from "rc-config-loader"

function loadConfigFromOption(configFilePath) {
    try {
        return loadConfigFile(configFilePath).config;
    } catch (error) {
        if (error.code === "ENOENT") {
            throw new Error(`Config file not found: ${configFilePath}`);
        }
        // Found it, but it is parsing error
        throw error;
    }
}
// load ./config/your-application.json, not ../config/your-application.json
const config = loadConfigFromOption("config/your-application.json");
```

### JavaScript and TypeScript config file

JavaScript and TypeScript config files are loaded by Node.js's `require()`.

- CommonJS: `module.exports` is the config
- ES Modules: `export default` is the config
- TypeScript: Node.js strips the types, and then loads it as CommonJS or ES Modules

```ts
// .your-applicationrc.ts
type Config = {
    rules: Record<string, boolean>;
};
const config: Config = {
    rules: {
        a: true
    }
};
export default config;
```

**Limitations:**

- ES Modules config file can not use top-level `await`, because `require(esm)` loads only synchronous modules
- TypeScript config file can use only [erasable syntax](https://nodejs.org/api/typescript.html#typescript-features). For example, `enum` is not supported, and `tsconfig.json` is not read
- Node.js caches ES Modules. If an ES Modules config file is changed in the same process, the changed content is not loaded

### Limit the extensions

Both `rcFile` and `loadConfigFile` accept `extensions` option to limit the extensions of config files.
Use it when your tool does not want to run JavaScript or TypeScript config files.

| | Default `extensions` |
| --- | --- |
| `rcFile` | `[".json", ".yaml", ".yml", ".js", ".ts"]` |
| `loadConfigFile` | `[".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts", ".cts", ".mts"]` |

`rcFile` searches fewer extensions by default, because each extension adds an existence check in every directory up to the root.
`loadConfigFile` reads only the given file, so it allows every supported extension by default.

```js
import { rcFile, loadConfigFile } from "rc-config-loader"

// search only .your-applicationrc.json, .your-applicationrc.yaml, and .your-applicationrc.yml
// The order of extensions is the priority of the search
rcFile("your-application", {
    extensions: [".json", ".yaml", ".yml"]
});

// also search .your-applicationrc.cjs and .your-applicationrc.mjs
rcFile("your-application", {
    extensions: [".json", ".yaml", ".yml", ".js", ".cjs", ".mjs", ".ts"]
});

// throws an Error that has `code: "ERR_RC_CONFIG_EXTENSION_NOT_ALLOWED"` for `config.js`
loadConfigFile("config.js", {
    extensions: [".json", ".yaml", ".yml"]
});
```

- A file without extension like `.your-applicationrc` is tried only as JSON(`.json`), YAML(`.yaml` or `.yml`), and JavaScript(`.js`) that are in `extensions`, in order of `extensions`
- `rcFile` does not try a file without extension if `extensions` has none of `.json`, `.yaml`, `.yml`, and `.js`. `loadConfigFile` throws the `ERR_RC_CONFIG_EXTENSION_NOT_ALLOWED` error in that case
- An empty array or an unsupported extension throws an Error
- `defaultExtension` option was removed. Use `extensions` instead. Passing `defaultExtension` throws an Error

### Example

```js
import { rcFile } from "rc-config-loader"
// load .eslintrc from current dir
console.log(rcFile("eslint"));

// load .eslintrc from specific path
console.log(rcFile("eslint", {
    configFileName: `${__dirname}/test/fixtures/.eslintrc`
}));
/*
config: { extends: 'standard',
  rules:
   { 'comma-dangle': [ 2, 'always-multiline' ],
     'arrow-parens': [ 2, 'as-needed' ] } }
filePath: ${__dirname}/test/fixtures/.eslintrc
 */

// load property from package.json
console.log(rcFile("rc-config-loader", {
    packageJSON: {
        fieldName: "directories"
    }
}));
/*
config: { test: 'test' }
filePath: /path/to/package.json
 */

// load .eslintrc from specific dir
console.log(rcFile("eslint", {
    cwd: `${__dirname}/test/fixtures`
}));

// load specific filename from current dir
console.log(rcFile("travis", {configFileName: ".travis"}));
/*
config: { sudo: false, language: 'node_js', node_js: 'stable' }
filePath: /path/to/.travis
 */

// try to load as .json, .yml, js
console.log(rcFile("bar", {
    configFileName: `${__dirname}/test/fixtures/.barrc`,
    extensions: [".json", ".yml", ".js"]
}));

// try to load as foobar, but .foobarrc is not found
console.log(rcFile("foorbar")); // => undefined

// try to load as .json, but it is not json
// throw SyntaxError
try {
    rcFile("unknown", {
        // This is not json
        configFileName: `${__dirname}/test/fixtures/.unknownrc`,
        extensions: [".json"]
    })
} catch (error) {
    console.log(error);
    /*
    SyntaxError: Cannot read config file: /test/fixtures/.unknownrc
    */
}
```

## Users

- [textlint](https://github.com/textlint/textlint "textlint")

## Changelog

See [Releases page](https://github.com/azu/rc-config-loader/releases).

## Running tests

Install devDependencies and Run `npm test`:

    npm i -d && npm test

## Contributing

Pull requests and stars are always welcome.

For bugs and feature requests, [please create an issue](https://github.com/azu/rc-config-loader/issues).

1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request :D

## Author

- [github/azu](https://github.com/azu)
- [twitter/azu_re](https://twitter.com/azu_re)

## License

MIT © azu

## Acknowledgement

- [zkochan/rcfile: Loads library configuration in all possible ways](https://github.com/zkochan/rcfile "zkochan/rcfile: Loads library configuration in all possible ways")

**Difference**

- support multiple formats for a file without extension  
