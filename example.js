// MIT © 2017 azu
"use strict";
const rcfile = require("./src/rc-config-loader");

// load .eslintrc from current dir
console.log(rcfile("eslint"));
// load .eslintrc from specific path
console.log(rcfile("eslint", {
    configFileName: `${__dirname}/test/fixtures/.eslintrc`
}));
/*
{ extends: 'standard',
  rules:
   { 'comma-dangle': [ 2, 'always-multiline' ],
     'arrow-parens': [ 2, 'as-needed' ] } }
 */
// load .eslintrc from specific dir
console.log(rcfile("eslint", {
    cwd: `${__dirname}/test/fixtures`
}));
// load specific filename from current dir
console.log(rcfile("travis", {configFileName: ".travis"}));
/*
{ sudo: false, language: 'node_js', node_js: 'stable' }
 */

// try to load as .json, .yml, js
console.log(rcfile("bar", {
    configFileName: `${__dirname}/test/fixtures/.barrc`,
    defaultExtension: [".json", ".yml", ".js"]
}));
// try to load as .yml, but it is not json
// throw Error
try {
    rcfile("unknown", {
        configFileName: `${__dirname}/test/fixtures/.unknownrc`,
        defaultExtension: ".json"
    })
} catch (error) {
    console.log(error);
    /*
    SyntaxError: Cannot read config file: /test/fixtures/.unknownrc
    */
}
