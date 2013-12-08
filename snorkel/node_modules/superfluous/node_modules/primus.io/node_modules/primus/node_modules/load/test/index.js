'use strict';

var assert = require('assert')
  , load = require('../');

[{
  it: 'always a sumes an exports pattern with only 1 global',
  does: function does() {
    var test = load('./fixtures/file.js');

    assert.ok(typeof test === 'object');
    assert.ok(typeof test.test === 'function');
    assert.ok(test.test() === 'foo:bar');
  }
}, {
  it: 'exposes more globals ? Assume exports.<key> pattern.',
  does: function does() {
    var lib = load('./fixtures/file2');
    assert.ok(typeof lib === 'object');
    assert.ok(typeof lib.foo === 'function');
    assert.ok(typeof lib.bar === 'function');
  }
}, {
  it: 'passes optional argument globals to file scope',
  does: function does() {
    var lib = load('./fixtures/file3', {foo: 'bar'});
    assert.equal(lib.getFoo(), 'bar');
  }
}, {
  it: 'adds nodejs globals to the code.',
  does: function () {
    var stream = load('./fixtures/globals.js').x;
    assert.ok(stream instanceof require('stream'));
  }
}, {
  it: 'exposes the compiler function for compiling source code',
  does: function () {
    assert.ok(typeof load.compiler === 'function');
  }
}, {
  it: 'doesnt throw when it wants to delete undefined variables',
  does: function () {
    load('./fixtures/globals.js', { undefined: undefined });
  }
}].forEach(function compiling(test, index) {
  console.log('('+ index +') it '+ test.it);
  test.does();
});
