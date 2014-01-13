var util = require('util'),
    SuperClass = require('../result').Result,
    _super = SuperClass.prototype;
    
exports.Result = Result;
function Result(config) {
  SuperClass.call(this, config);
  this.packages = {};
}

util.inherits(Result, SuperClass);

(function(p) {
  p.addDependency = addDependency;
  p.addModule = addDependency;
  function addDependency(module) {
    _super.addDependency.call(this, module);
    if (module.package) {
      this.addPackage(module.package);
    }
  }

  p.addPackage = addPackage;
  function addPackage(pkg) {
    if (!this.hasPackage(pkg)) {
      this.packages[pkg.id] = pkg;
    }
  }

  p.hasPackage = hasPackage;
  function hasPackage(pkg) {
    return (pkg.id in this.packages);
  }

  p.getPackageCount = getPackageCount;
  function getPackageCount() {
    return Object.keys(this.packages).length;
  }
})(Result.prototype);

exports.createResult = createResult;
exports.create = createResult;
function createResult(config) {
  return new Result(config);
}