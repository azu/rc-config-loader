// MIT © 2017 azu
"use strict";
const { rcFile } = require("./lib/rc-config-loader");

// load .eslintrc from current dir
console.log(
    rcFile("eslint", {
        cwd: `${__dirname}/test/fixtures/`,
    })
);

// load .eslintrc from specific path
console.log(
    rcFile("eslint", {
        configFileName: `${__dirname}/test/fixtures/.eslintrc`,
    })
);
/*
{ extends: 'standard',
  rules:
   { 'comma-dangle': [ 2, 'always-multiline' ],
     'arrow-parens': [ 2, 'as-needed' ] } }
 */

// load property from pacakge.json
console.log(
    rcFile("rc-config-loader", {
        packageJSON: {
            fieldName: "directories",
        },
    })
);
/*
{ test: 'test' }
 */

// load .eslintrc from specific dir
console.log(
    rcFile("eslint", {
        cwd: `${__dirname}/test/fixtures`,
    })
);

// load specific filename from current dir
console.log(rcFile("travis", { configFileName: ".travis" }));
/*
{ sudo: false, language: 'node_js', node_js: 'stable' }
 */

// try to load as .json, .yml, js
console.log(
    rcFile("bar", {
        configFileName: `${__dirname}/test/fixtures/.barrc`,
        defaultExtension: [".json", ".yml", ".js"],
    })
);

// try to load as .json, but it is not json
// throw Error
try {
    rcFile("unknown", {
        configFileName: `${__dirname}/test/fixtures/.unknownrc`,
        defaultExtension: ".json",
    });
} catch (error) {
    console.log(error);
    /*
    SyntaxError: Cannot read config file: /test/fixtures/.unknownrc
    */
}
