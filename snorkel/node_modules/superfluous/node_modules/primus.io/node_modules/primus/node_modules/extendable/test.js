'use strict';

var extend = require('./index')
  , assert = require('assert')
  , EventEmitter = require('events').EventEmitter;

function Awesomeness() {
  var self = this;

  this.foo = 'foo';

  setTimeout(function () {
    self.render(self.data);
  }, 100);

  EventEmitter.call(this);
}

Awesomeness.prototype = new EventEmitter;
Awesomeness.prototype.constructor = Awesomeness;

Awesomeness.prototype.data = 'bar';
Awesomeness.prototype.render = function render() {
  // does nothing
};

Awesomeness.extend = extend;

var SuperAwesome = Awesomeness.extend({
    data: 'trololol'

  , render: function render(data) {
      assert.ok(this.data === 'trololol');
      assert.ok(data === 'trololol');
      assert.ok(this.foo === 'foo');

      console.log(data, this.foo);
    }
});

new SuperAwesome();
// outputs "trololo" after 100 ms
