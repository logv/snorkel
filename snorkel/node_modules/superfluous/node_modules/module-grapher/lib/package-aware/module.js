var util = require('util'),
    SuperClass = require('../module').Module,
    _super = SuperClass.prototype;

exports.createModule = createModule;
exports.create = createModule;
function createModule(ident) {
  return new Module(ident);
}

exports.Module = Module;
function Module(ident) {
  SuperClass.call(this, ident);
}

util.inherits(Module, SuperClass);

(function(p) {
  p.package = null;

  p.setPackage = setPackage;
  function setPackage(pkg) {
    pkg.addModule(this);
    this.package = pkg;
  }
})(Module.prototype);

