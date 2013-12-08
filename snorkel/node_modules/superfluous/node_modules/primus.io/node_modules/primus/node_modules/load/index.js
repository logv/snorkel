'use strict';

var path = require('path')
  , vm = require('vm')
  , fs = require('fs');

/**
 * Load:
 *
 * Loads plain'ol JavaScript files without exports, module patterns in to Node.
 * The only assumption it makes is that it introduces at least one global.
 *
 * @param {String} location
 * @returns {Mixed}
 * @api public
 */
function load(location, globals) {
  globals = globals || {};

  if (!path.extname(location)) location = location +'.js';
  location = path.resolve(path.dirname(module.parent.filename), location);

  globals.__filename = path.basename(location);
  globals.__dirname = path.dirname(location);

  return compiler(read(location), path.basename(location), globals);
}

/**
 * The module compiler.
 *
 * @param {String} code The source code that needs to be compiled
 * @param {String} name The name of the file.
 * @param {Object} globals Additional globals
 * @returns {Mixed} Things.
 * @api public
 */
function compiler(code, name, globals) {
  name = name || 'load.js';
  globals = globals || {};

  var context = { load: require };

  // Add the missing globals that are not present in vm module.
  Object.keys(missing).forEach(function missingInVM(global) {
    context[global] = missing[global];
  });

  // Add extra globals.
  Object.keys(globals).forEach(function missingInVM(global) {
    context[global] = globals[global];
  });

  // Run it in a context so we can expose the globals.
  context = vm.createContext(context);
  vm.runInContext(code, context, name);

  // Remove the load module if it's still unchanged
  if (context.load === require) delete context.load;

  Object.keys(missing).forEach(function missingInVM(global) {
    if (context[global] === missing[global]) {
      try { delete context[global]; }
      catch (e) {}
    }
  });

  Object.keys(globals).forEach(function missingInVM(global) {
    if (context[global] === globals[global]) {
      try { delete context[global]; }
      catch (e) {}
    }
  });

  return context;
}

/**
 * Code reading and cleaning up.
 *
 * @param {String} location
 * @api private
 */
function read(location) {
  var code = fs.readFileSync(location, 'utf-8');

  //
  // Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
  // because the buffer-to-string conversion in `fs.readFileSync()`
  // translates it to FEFF, the UTF-16 BOM.
  //
  if (code.charCodeAt(0) === 0xFEFF) {
    code = code.slice(1);
  }

  return code;
}

/**
 * The following properties are missing when loading plain ol files.
 *
 * @type {Object}
 * @private
 */
var missing = Object.keys(global).reduce(function add(missing, prop) {
  missing[prop] = global[prop];
  return missing;
}, { require: require });

//
// These values should not be exposed as they point to our module.
//
delete missing.module;
delete missing.exports;

//
// Expose the module.
//
load.compiler = compiler;
module.exports = load;
