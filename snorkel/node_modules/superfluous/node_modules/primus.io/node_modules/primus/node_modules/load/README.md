# load

[![Build Status](https://travis-ci.org/3rd-Eden/load.png)](https://travis-ci.org/3rd-Eden/load)
[![NPM version](https://badge.fury.io/js/load.png)](http://badge.fury.io/js/load)

Because fuck dedicated module patterns, module loaders, compilers and other kind
of pointless code bloat that requires me to wrap my client-side JavaScript for
server usage.

People need to understand that the Node.js module system is nothing more then a
`vm` that reads our a pre-defined `module` variable. We don't need to be stuck
in this pattern, we can just get all the globals that are introduced while we
load the script and tada, we're running the snippet on the server.

## Installation

Load is available in `npm` so you can install it by running:

```
npm --save load
```

## API

```js
var load = require('load');

// file.js contents:
//
// function test() { return 'test' };
//

// load returns all the introduced globals as an object, so specify the name of
// function you need in order to call it.
var test = load('file.js').test;

// file2.js contents:
//
// function test() {}
// function test1() {}
//

var library = load('file2');
console.log(library.test);
console.log(library.test1);

var moo = load.compiler('function cow() { console.log("moo") }', 'moo.js');
moo(); // console.log('moo');

// And that it.
```

## License

MIT
