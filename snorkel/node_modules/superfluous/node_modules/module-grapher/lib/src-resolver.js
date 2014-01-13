var path = require('path'),
    fs = require('fs'),
    serialize = require('async-it').serial;

exports.createSrcResolver = createSrcResolver;
exports.create = createSrcResolver;
function createSrcResolver(config) {
  return new SrcResolver(config);
}

exports.SrcResolver = SrcResolver;
function SrcResolver(config) {
  this.allowDirModules = config.allowDirModules;
  this.preProcessSrc = config.preProcessSrc;
  this.setExtensions(config.extensions);
  this.setPaths(config.paths);
  this.setRoot(config.root);
}

(function(p) {
  p.allowDirModules = null;
  p.extensions = null;
  p.paths = null;
  p.root = null;

  p.setExtensions = setExtensions;
  function setExtensions(extensions) {
    extensions = extensions || ['.js', '.coffee'];
    this.extensions = extensions.map(function(ext) {
      ext = ext || '';
      return ext.indexOf('.') === 0 ? ext : '.' + ext;
    });
  }

  p.setPaths = setPaths;
  function setPaths(paths) {
    this.paths = (paths || ['.']).slice(0); // clone it
    if (this.paths.indexOf('.') < 0) {
      this.paths.push('.');
    }
  }

  p.setRoot = setRoot;
  function setRoot(root) {
    this.root = root || process.cwd();
  }

  p.resolve = resolve;
  function resolve(module, callback) {
    var relativePath = path.join.apply(path, module.identifier.terms);
    this.resolvePath(relativePath, module, callback);
  }

  p.resolvePath = resolvePath;
  function resolvePath(relativePath, module, callback) {
    var self = this;
    // Iterate over each paths supplied in `config`.
    serialize.forEach(this.paths, function(currentPath, checkNextPath) {
      var resolvedPath = path.resolve(self.root, currentPath, relativePath);
      self.resolveExtension(resolvedPath, module, function(p, isDir) {
        if (p) {
          module.searchPath = currentPath;
          self.readSrc(p, module, function(err, src) {
            if (err) {
              module.missing = true;
              callback(err, isDir);
            } else {
              module.raw = src;
              callback(null, isDir);
            }
          });
        } else {
          checkNextPath();
        }
      });
    }, function() {
      var err = new Error('Cannot find module: ' + module),
          exts = '.[' + self.extensions.map(function(e) { return e.substring(1); }).join('|') + ']';

      err.file = module.lastRequiredBy ? module.lastRequiredBy.fullPath : '@'; // firebug convention
      err.longDesc = err.toString() + '\n    in ' + err.file + '\nTried looking for it in the following files:';
      self.paths.forEach(function(searchPath) {
        err.longDesc +='\n    ' + path.resolve(self.root, searchPath, relativePath + exts);
        if (self.allowDirModules) {
          err.longDesc +='\n    ' + path.resolve(self.root, searchPath, relativePath, 'index' + exts);
        }
      });
      err.toString = function() { return err.longDesc };
      callback(err);
    });
  }

  p.resolveExtension = resolveExtension;
  function resolveExtension(fullPath, module, callback) {
    var self = this;
    serialize.forEach(this.extensions, function(ext, checkNextExtension) {
      var p = fullPath + ext;
      fs.stat(p, function(err, stats) {
        if (!err && stats.isFile()) {
          module.mtime = stats.mtime
          module.fullPath = p;
          module.relativePath = path.relative(self.root, p);
          module.ext = ext;
          callback(p, false);
        } else if (self.allowDirModules) {
          // look for [modName]/index[.ext]
          p = path.join(fullPath, 'index') + ext;
          fs.stat(p, function(err, stats) {
            if (!err && stats.isFile()) {
              module.mtime = stats.mtime;
              module.fullPath = p;
              module.relativePath = path.relative(self.root, p);
              module.ext = ext;
              callback(p, true);
            } else {
              checkNextExtension();
            }
          });
        } else {
          checkNextExtension();
        }
      });
    }, callback);
  }

  p.readSrc = readSrc;
  function readSrc(fullPath, module, callback) {
    var self = this;
    fs.readFile(fullPath, 'utf8', function(err, src) {
      if (err) {
        err.message = 'Cannot find module: ' + module + '. ' + err.message;
        callback(err);
      } else if (src == null) {
        err = new Error('Cannot find module: ' + module + '. File ' + fullPath + ' does not exist.' );
        callback(err);
      } else {
        if (self.preProcessSrc) {
          src = self.preProcessSrc(src);
        }

        self.src = src;
        callback(null, src);
      }
    });
  }
})(SrcResolver.prototype);
