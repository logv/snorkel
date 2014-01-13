var module = require('./module'),
    identifier = require('./identifier');

exports.Result = Result;
function Result(config) {
  this.instantiatedAt = new Date()
  this.dependencies = this.modules = {};
  this.externals = this.normalizeExternals(config.externals);
}

(function(p) {
  p.resolved = false;
  p.main = null;

  p.resolve = resolve;
  function resolve(resolver) {
    this.resolved = true;
    this.timestamp = this.resolvedAt = new Date();
    this.resolver = resolver;
  }

  p.normalizeExternals = normalizeExternals;
  function normalizeExternals(externals) {
    if (Array.isArray(externals)) {
      return externals.reduce(function(output, ident) {
        ident = identifier.create(ident);
        var m = module.create(ident);
        m.external = true;
        output[m.id] = m;
        return output;
      }, {});
    }
    return externals || {};
  }

  p.setMain = setMain;
  function setMain(module) {
    this.main = module;
    this.dependencies[module.id] = module;
  }

  p.addDependency = addDependency;
  p.addModule = addDependency;
  function addDependency(module) {
    if (this.hasDependency(module)) { return; }
    this.dependencies[module.id] = module;
  }

  p.hasDependency = hasDependency;
  p.hasModule = hasDependency;
  function hasDependency(module) {
    return (module.id in this.dependencies);
  }

  p.getLoc = getLoc;
  function getLoc() {
    return this.main.getTotalLoc();
  }

  p.getSloc = getSloc;
  function getSloc() {
    return this.main.getTotalSloc();
  }

  p.getSize = getSize;
  function getSize() {
    return this.main.getTotalSize();
  }

  p.getDependencyCount = getDependencyCount;
  p.getModuleCount = getDependencyCount;
  function getDependencyCount() {
    return Object.keys(this.dependencies).length;
  }

  p.markDuplicates = markDuplicates;
  function markDuplicates(marker) {
    marker.markDuplicates(this.dependencies);
  }
})(Result.prototype);

exports.createResult = createResult;
exports.create = createResult;
function createResult(config) {
  return new Result(config);
}