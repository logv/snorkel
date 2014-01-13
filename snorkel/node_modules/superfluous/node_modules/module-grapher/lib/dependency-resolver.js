var identifier = require('./identifier'),
    parallelize = require('async-it').parallel;

exports.DependencyResolver = DependencyResolver;
function DependencyResolver(config) {
  this.config = config || {};
  this.srcResolver = this.createSrcResolver(this.config);
  this.parser = this.createParser(this.config);
  this.moduleFactory = this.createModuleFactory(this.config);
  this.duplicateMarker = this.createDuplicateMarker(this.config);
  this.moduleCache = {};
}

(function(p) {
  p.parser = null;
  p.srcResolver = null;
  p.moduleCache = null;

  p.createModule = createModule;
  function createModule(ident) {
    if (typeof ident == 'string') {
      ident = identifier.create(ident).resolve();
    }

    var moduleCache = this.moduleCache,
        id = ident.toString();

    if (!(id in moduleCache)) {
      moduleCache[id] = this.moduleFactory.create(ident);
    }
    return moduleCache[id];
  }

  p.createModuleFactory = createModuleFactory;
  function createModuleFactory(config) {
    return require('./module');
  }

  p.createSrcResolver = createSrcResolver;
  function createSrcResolver(config) {
    return require('./src-resolver').create(config);
  }

  p.createParser = createParser;
  function createParser(config) {
    return require('./parser').create(config);
  }

  p.createDuplicateMarker = createDuplicateMarker;
  function createDuplicateMarker(config) {
    return require('./duplicate-marker');
  }

  p.createResult = createResult;
  function createResult(config) {
    return require('./result').create(config);
  }

  p.compile = compile;
  function compile(module) {
    if (module.ext === '.coffee') {
      module.compile(require('coffee-script'));
    }
  }

  p.fromModule = fromModule;
  function fromModule(module, result, callback) {
    var self = this;

    if (!callback) {
      callback = result;
      result = this.createResult(this.config);
    }

    result.setMain(module);
    module.resolve(this, function(err) {
      if (err) {
        callback(err);
      } else {
        self.resolveModules(module.getDirectDependencies(), result, function(err) {
          result.markDuplicates(self.duplicateMarker);
          result.resolve(self);
          callback(err, result);
        });
      }
    });
  }

  p.fromSrc = fromSrc;
  function fromSrc(src, result, callback) {
    var self = this,
        modules = {};

    if (!callback) {
      callback = result;
      result = this.createResult(this.config);
    }

    try {
      this.parse(src).forEach(function(ident) {
        var m = this.createModule(ident);
        modules[m.id] = m;
      }, this);
      this.resolveModules(modules, result, function(err) {
        result.markDuplicates(self.duplicateMarker);
        result.resolve(self);
        callback(err, result);
      });
    } catch(err) {
      process.nextTick(function() {
        result.markDuplicates(self.duplicateMarker);
        result.resolve(self);
        callback(err, result);
      });
    }
  }

  p.resolveModules = resolveModules;
  function resolveModules(modules, result, callback) {
    var self = this;
    parallelize.forEach(Object.keys(modules), function(id, cont) {
      var module = modules[id];
      if (result.hasDependency(module)) {
        cont(null);
      } else {
        module.resolve(self, function(err, isDir) {
          if (err) {
            cont(err);
          } else {
            if (isDir) {
              // Find the identifier of the related module. This is `foo/index`
              // for `foo`.
              var indexId = identifier.fromDirIdentifier(module.identifier);

              // Looks to see if there already exists a module with this id.
              var indexModule = result.dependencies[indexId];

              if (indexModule) {
                if (indexModule.fullPath !== module.fullPath) {
                  // if it doesn't point to the same file, error out.
                  var msg = '', err;
                  msg += 'Module ' + module.id + ' references module ' + indexModule.id;
                  msg += ' which mistakenly points to ' + indexModule.fullPath + '.';
                  err = new Error(msg);
                  _addFileToError(err, module.fullPath);
                  cont(err);
                } else {
                  // If it does, we'll want to make the module point to it.
                  module.pointTo(indexModule);
                  // Now we just need to add our module to the results object.
                  result.addDependency(module);
                  // We can stop here as there's no work to be done. (indexModule
                  // has already been resolved).
                  cont(null);
                }
              } else {
                // If there's no pre-exisiting indexModule module,
                // we'll have to generate one from scratch.
                indexModule = module.clone();
                // Set it with a proper identifier (the one that ends in /index).
                indexModule.setIdentifier(indexId);
                // It's a clone so we'll need to wipe out its requirers as
                // it's only current requirer is the module itself.
                indexModule.clearRequirers();

                // Our original module will just need to point to this clone.
                module.pointTo(indexModule);
                // And add both to the results object.
                result.addDependency(indexModule);
                result.addDependency(module);

                // We'll have to continue resolving the modules required by indexModule.
                self.resolveModules(indexModule.getDirectDependencies(), result, cont);
              }
            } else {
              result.addDependency(module);
              self.resolveModules(module.getDirectDependencies(), result, cont);
            }
          }
        });
      }
    }, callback);
  }

  p.resolveModule = resolveModule;
  function resolveModule(module, callback) {
    var self = this;
    this.srcResolver.resolve(module, function(err, isDir) {
      if (err) {
        module.missing = true;
        self.config.allowMissingModules ? callback(null, isDir) : callback(err, isDir);
      } else {
        try {
          self.compile(module);
          module.parseSrc(self, isDir).forEach(function(ident) {
            var dep = self.createModule(ident);
            module.addDependency(dep);
          });
          callback(null, isDir);
        } catch(err) {
          callback(err, isDir);
        }
      }
    });
  }

  p.parse = parse;
  function parse(src, requirer, isDir) {
    var file = requirer ? requirer.fullPath : '@', // firebug convention
        reqIdent = requirer ? requirer.identifier : null,
        parserOutput = null,
        results = [];

    var cache, fullPath, mtime;
    var shouldCache = this.config.cache && requirer;
    if (shouldCache) {
      cache = this.config.cache;
      fullPath = requirer.fullPath;
      mtime = requirer.mtime.getTime();
      if (cache[fullPath] && mtime === cache[fullPath].mtime) {
        parserOutput = cache[fullPath].parserOutput;
      }
    }

    if (!parserOutput) {
      parserOutput = this.parser.parse(src, file);
      if (shouldCache) {
        cache[fullPath] = {
          mtime: mtime,
          parserOutput: parserOutput
        };
      }
    }

    results.ast = parserOutput.ast;

    parserOutput.forEach(function(arg) {
      var ident;
      if (!arg) {
        throw _createTypeError('Empty require call', file);
      }

      if (arg[0] != 'string') {
        // If dynamic identifiers are allowed just log.
        // Dynamic identifiers might be useful to require modules
        // at runtime but breaks static analysis.
        if (this.config.allowDynamicModuleIdentifiers) {
          // TODO log warning to the console in verbose mode
        } else {
          // If dynamic identifiers aren't allowed, create an error.
          // Get actual source code to throw more meaningful errors.
          var msg = 'Cannot resolve dynamic module identifiers: ' + this.parser.astToSrcCode(arg);
          throw _createTypeError(msg, file);
        }
      } else {
        // Build an identifier object to check for validity.
        ident = identifier.create(arg[1]);

        // If the identifier is not valid, throw.
        if (!ident.isValid()) {
          throw _createTypeError('Invalid module identifier: ' + ident, file);
        }
        // Try resoving the identifer.
        try {
          ident = ident.resolve(reqIdent, isDir);
        } catch(e) {
          _addFileToError(e, file);
          throw e;
        }
      }

      if (ident) {
        results.push(ident);
      }
    }, this);
    return results;
  }
})(DependencyResolver.prototype);

exports.createDependencyResolver = createDependencyResolver;
exports.create = createDependencyResolver;
function createDependencyResolver(config) {
  return new DependencyResolver(config);
}

function _createTypeError(msg, file) {
  var err = new TypeError(msg);
  _addFileToError(err, file);
  Error.captureStackTrace(err, _createTypeError);
  return err;
}

function _addFileToError(err, file) {
  err.file = file;
  err.longDesc = err.toString() + '\n    in ' + file;
  err.toString = function() { return err.longDesc; };
  Error.captureStackTrace(err, _addFileToError);
}