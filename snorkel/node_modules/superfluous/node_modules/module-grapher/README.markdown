module-grapher
==============

`module-grapher` resolves [CommonJS module][1] dependencies through recursive static analysis.

Although itself a [node.js][2] program, `module-grapher`'s main target is client-side code.

While it can be used to build dependency graphs of node programs, it is unaware of node's special `node_modules` directory or [NPM][3]'s nested package dependencies conventions. In fact, `module-grapher` is totally unaware of packages at large (it supports search paths, however). Programs relying on external packages will need to install them via a package manager like [Kris Zyp][4]'s excellent [CPM][5]. `module-grapher` is designed to resolve _module_ dependencies, not _package_ dependencies.

In the future, `module-grapher` might become package-aware to handle cases where multiple versions of the same package are required, but this is not currently a priority.

`module-grapher` supports [CoffeeScript][6] and can be easily extended to support other languages which compile to JavaScript.

Install
-------

`module-grapher` is available as an NPM module.

    $ npm install module-grapher

Usage
-----

`module-grapher` accepts an filepath, source code or module identifier as input.

To get dependencies from a module:

```javascript
require('module-grapher').graph('foo', {
  paths: ['./lib', './vendor'], // defaults to the equivalent of ['.']
  root: 'path/to/package/root/' // defaults to process.cwd()
}, callback);
```

Other options include:

* `extensions` (defaults to `['.js', '.coffee']`): an array of supported extensions.
* `allowDirModules`: Also search for modules in the index file of the directory named after them. So look for module `foo/bar` not only in `foo/bar.js` but also in `foo/bar/index.js`. Defaults to `false`.
* `allowMissingModules`: don't throw when a module is missing. Just mark it as such. Defaults to `false`.
* `allowDynamicModuleIdentifiers`: don't throw when the identifier of module isn't a string. Defaults to `false`.

License
-------

Your choice of [MIT or Apache, Version 2.0 licenses][7]. `module-grapher` is copyright 2010 [Tobie Langel][8].

[1]: http://wiki.commonjs.org/wiki/Modules/1.1
[2]: http://nodejs.org
[3]: http://npmjs.org
[4]: http://www.sitepen.com/blog/author/kzyp/
[5]: http://github.com/kriszyp/cpm
[6]: http://jashkenas.github.com/coffee-script
[7]: https://raw.github.com/tobie/module-grapher/master/LICENSE
[8]: http://tobielangel.com