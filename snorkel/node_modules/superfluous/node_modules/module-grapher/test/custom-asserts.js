module.exports = require('assert');

module.exports.isTrue = function(actual) {
  module.exports.strictEqual(true, actual, 'Expected "' + actual + '" to be true.');
};

module.exports.isFalse = function(actual) {
  module.exports.strictEqual(false, actual, 'Expected "' + actual + '" to be false.');
};

