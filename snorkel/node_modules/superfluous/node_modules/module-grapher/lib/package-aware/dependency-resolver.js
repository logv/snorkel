var util = require('util'),
    SuperClass = require('../dependency-resolver').DependencyResolver,
    _super = SuperClass.prototype;

exports.DependencyResolver = DependencyResolver;
function DependencyResolver(config) {
  SuperClass.call(this, config);
  this.isPackageAware = true;
}

util.inherits(DependencyResolver, SuperClass);

(function(p) {
  p.createModuleFactory = createModuleFactory;
  function createModuleFactory(config) {
    return require('./module');
  }
  
  p.createSrcResolver = createSrcResolver;
  function createSrcResolver(config) {
    return require('./src-resolver').create(config);
  }

  p.createResult = createResult;
  function createResult(config) {
    return require('./result').create(config);
  }

})(DependencyResolver.prototype);

exports.createDependencyResolver = createDependencyResolver;
exports.create = createDependencyResolver;
function createDependencyResolver(config) {
  return new DependencyResolver(config);
}