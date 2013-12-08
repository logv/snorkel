'use strict';

function test() {
  console.log('console.log(foo:bar)');

  setTimeout(function () {
    console.log('setTimeout()');
  }, 100);

  var x = setInterval(function () {
    console.log('setInterval()');
    clearTimeout(x);
  }, 1000);

  return 'foo:bar';
}
