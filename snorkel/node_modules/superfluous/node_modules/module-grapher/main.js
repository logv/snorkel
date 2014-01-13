var identifier = require('./lib/identifier'),
    fs = require('fs');

exports.createDependencyResolver = createDependencyResolver;
function createDependencyResolver(config) {
  var dependencyResolver;
  if (config.isPackageAware) {
    dependencyResolver = require('./lib/package-aware/dependency-resolver');
  } else {
    dependencyResolver = require('./lib/dependency-resolver');
  }
  return dependencyResolver.create(config);
}

exports.graphSrc = graphSrc;
function graphSrc(src, config, callback) {
  if (!callback) {
    callback = config;
    config = {};
  }
  var resolver = createDependencyResolver(config);
  resolver.fromSrc(src, callback);
}

exports.graph = graph;
function graph(ident, config, callback) {
  if (!callback) {
    callback = config;
    config = {};
  }
  var resolver = createDependencyResolver(config),
      module = resolver.createModule(ident);

  resolver.fromModule(module, callback);
}

exports.graphPath = graphPath;
function graphPath(p, config, callback) {
  fs.readFile(p, 'utf8', function(err, src) {
    err ? callback(err) : graphSrc(src, config, callback);
  });
}
