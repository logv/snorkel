x = (function globals() {
  'use strict';

  if ('undefined' !== typeof module) throw new Error('I should not exist');
  if ('undefined' !== typeof exports) throw new Error('I should not exist');

  console.log('Buffer.isBuffer', Buffer.isBuffer(null));
  return new(require('stream'));
})();
