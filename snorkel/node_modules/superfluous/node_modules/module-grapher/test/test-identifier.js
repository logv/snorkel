var assert = require('./custom-asserts');

var identifier = require('../lib/identifier'),
    create = identifier.create;

suite('Identifier', function() {
  test("require('identifier').fromDirIdentifier returns a clone of the identifier with index added to it.", function() {
    var ident = create('./foo/bar');
    var dirIdent = identifier.fromDirIdentifier(ident);
    assert.notStrictEqual(ident, dirIdent);
    assert.deepEqual(['.', 'foo', 'bar', 'index'], dirIdent.terms);
  });

  test("Identifier#isValid returns true for valid identifiers", function() {
    assert.isTrue(create('foo').isValid());
    assert.isTrue(create('./foo').isValid());
    assert.isTrue(create('../foo').isValid());
    assert.isTrue(create('./foo/../B-A-R/../1_2_3').isValid());
  });

  test("Identifier#isValid returns false for invalid identifiers", function() {
    assert.isFalse(create('.../foo').isValid());
    assert.isFalse(create('foo.js').isValid());
    assert.isFalse(create('f@@').isValid());
  });

  test("Identifier#isRelative returns true for relative identifiers", function() {
    assert.isTrue(create('../foo').isRelative());
    assert.isTrue(create('./foo').isRelative());
    assert.isTrue(create('../../foo').isRelative());
  });

  test("Identifier#isRelative returns false for top-level identifiers", function() {
    assert.isFalse(create('foo').isRelative());
    assert.isFalse(create('foo/bar/baz').isRelative());
    assert.isFalse(create('foo/../../foo').isRelative());
  });

  test("Identifier#isTopLevel returns true for top-level identifiers", function() {
    assert.isTrue(create('foo').isTopLevel());
  });

  test("Identifier#isTopLevel returns false for relative identifiers", function() {
    assert.isFalse(create('./foo').isTopLevel());
  });

  test("Identifier#toArray returns an array of terms", function() {
    assert.deepEqual(['.', 'foo', 'bar'], create('./foo/bar').toArray());
    assert.deepEqual(['foo', 'bar'], create('foo/bar').toArray());
  });

  test("Identifier#toArray returns cloned terms", function() {
    var ident = create('./foo/bar')
    assert.notStrictEqual(ident.toArray(), ident.toArray());
  });

  test("Identifier#toString returns cleaned up version of the identifier", function() {
    var str = './foo//bar';
    assert.notEqual(str, create(str).toString());
    assert.equal('./foo/bar', create(str).toString());
  });

  test("Identifier#clone returns a new Identifier object.", function() {
    var ident = create('./foo/bar')
    assert.ok(ident.clone().constructor === ident.constructor);
    assert.notStrictEqual(ident, ident.clone());
  });

  test("Identifier#clone returns a copy of the identifier with equal but not identical terms.", function() {
    var ident = create('./foo/bar')
    assert.deepEqual(ident.terms, ident.clone().terms);
    assert.notStrictEqual(ident.terms, ident.clone().terms);
  });

  test("Identifier#getDirTerms returns the terms up to the modules dir", function() {
    assert.deepEqual(['.', 'foo'], create('./foo/bar').getDirTerms());
    assert.deepEqual(['foo'], create('foo/bar').getDirTerms());
    assert.deepEqual(['.'], create('./bar').getDirTerms());
    assert.deepEqual([], create('bar').getDirTerms());
  });

  test("When the module is a dir module, Identifier#getDirTerms returns the terms up to the module itself", function() {
    assert.deepEqual(['.', 'foo', 'bar'], create('./foo/bar').getDirTerms(true));
    assert.deepEqual(['bar'], create('bar').getDirTerms(true));
  });

  test("Identifier#resolve returns an new, top-level identifier when resolved with a top-level identifier", function() {
    var ident = create('./bar').resolve(create('foo/baz/foo-bar'));
    assert.strictEqual(ident.constructor, identifier.Identifier);
    assert.ok(ident.isTopLevel());
    assert.strictEqual('foo/baz/bar', ident.toString());
  });

  test("Identifier#resolve returns an new, top-level identifier when resolved with a relative identifier", function() {
    var ident = create('./bar').resolve(create('./foo/bar/../foo-bar'));
    assert.strictEqual(ident.constructor, identifier.Identifier);
    assert.ok(ident.isTopLevel());
    assert.strictEqual('foo/bar', ident.toString());
  });

  test("Identifier#resolve returns an new, top-level identifier when resolved without a resolver", function() {
    var ident = create('./bar').resolve();
    assert.strictEqual(ident.constructor, identifier.Identifier);
    assert.ok(ident.isTopLevel());
    assert.strictEqual('bar', ident.toString());
  });

  test("Identifier#resolve throws an out of bound error if resolving the identifier is outside of the current root dir.", function() {
    assert.throws(function() { create('../bar').resolve(null) }, 'RangeError');
  });

  test("Identifier#resolve always resolves top-level identifiers to themselves", function() {
    assert.strictEqual('bar', create('bar').resolve(null).toString());
    assert.strictEqual('bar', create('bar').resolve(create('foo/bar/baz')).toString());
  });

  test("Identifier#resolveTerms", function() {

  });
});

