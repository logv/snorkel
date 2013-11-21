"use strict";
var crypto = require("crypto");

module.exports = function quick_hash(data) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(data);
  var hash = md5sum.digest('hex');
  return hash;
};
